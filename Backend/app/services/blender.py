"""Local Blender worker adapter used by queued scene and export jobs."""

import asyncio
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.core.security import utc_now

logger = logging.getLogger(__name__)
STORAGE_ROOT = Path(os.getenv("STUDIO_STORAGE_DIR", Path(__file__).resolve().parents[2] / "storage")).resolve()


def _blender_binary() -> str | None:
    return os.getenv("BLENDER_EXECUTABLE") or "blender" if _command_exists(os.getenv("BLENDER_EXECUTABLE") or "blender") else None


def _command_exists(command: str) -> bool:
    import shutil
    return Path(command).is_file() if ("/" in command or "\\" in command) else shutil.which(command) is not None


def _bpy_script(action: str, output: Path, source: Path | None, fmt: str | None, scene: dict[str, Any]) -> str:
    # Blender executes this script in its own Python runtime. Paths and input are JSON encoded.
    payload = json.dumps({"action": action, "output": str(output), "source": str(source) if source else None, "format": fmt, "scene": scene})
    return '''import bpy, json, os, sys
cfg=json.loads(%r)
src=cfg["source"]
if src and os.path.isfile(src):
    ext=os.path.splitext(src)[1].lower()
    if ext==".blend": bpy.ops.wm.open_mainfile(filepath=src)
    elif ext in (".glb", ".gltf"): bpy.ops.import_scene.gltf(filepath=src)
    elif ext==".fbx": bpy.ops.import_scene.fbx(filepath=src)
    elif ext==".obj": bpy.ops.wm.obj_import(filepath=src)
    else: raise RuntimeError("Unsupported Blender source format: "+ext)
scene=cfg["scene"] or {}
if cfg["action"]=="render":
    s=bpy.context.scene
    if not s.camera:
        bpy.ops.object.camera_add(location=(7,-7,5)); s.camera=bpy.context.object; s.camera.rotation_euler=(1.109,0,0.785)
    if not any(obj.type=="LIGHT" for obj in s.objects): bpy.ops.object.light_add(type="AREA", location=(4,-4,6)); bpy.context.object.data.energy=1500
    s.render.resolution_x=int(scene.get("resolution_x", 1920)); s.render.resolution_y=int(scene.get("resolution_y", 1080))
    s.render.resolution_percentage=int(scene.get("resolution_percentage", 100))
    s.render.filepath=cfg["output"]
    bpy.ops.render.render(write_still=True)
elif cfg["action"]=="render_animation":
    s=bpy.context.scene
    if not s.camera:
        bpy.ops.object.camera_add(location=(7,-7,5)); s.camera=bpy.context.object; s.camera.rotation_euler=(1.109,0,0.785)
    if not any(obj.type=="LIGHT" for obj in s.objects): bpy.ops.object.light_add(type="AREA", location=(4,-4,6)); bpy.context.object.data.energy=1500
    s.render.resolution_x=int(scene.get("resolution_x", 1920)); s.render.resolution_y=int(scene.get("resolution_y", 1080))
    s.render.resolution_percentage=int(scene.get("resolution_percentage", 100))
    s.render.image_settings.file_format="FFMPEG"; s.render.ffmpeg.format="MPEG4"; s.render.ffmpeg.codec="H264"
    s.render.filepath=cfg["output"]; bpy.ops.render.render(animation=True)
elif cfg["action"].startswith("mesh_"):
    op=cfg["action"][5:]
    meshes=[obj for obj in bpy.context.scene.objects if obj.type=="MESH"]
    report={"meshCount":len(meshes),"vertices":sum(len(obj.data.vertices) for obj in meshes),"polygons":sum(len(obj.data.polygons) for obj in meshes),"nonManifoldEdges":0,"operation":op}
    if op=="validate":
        for obj in meshes:
            bpy.context.view_layer.objects.active=obj; bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.mesh.select_non_manifold(); report["nonManifoldEdges"]+=sum(1 for e in obj.data.edges if len(e.vertices)==2 and sum(1 for p in obj.data.polygons if e.vertices[0] in p.vertices and e.vertices[1] in p.vertices)!=2); bpy.ops.object.mode_set(mode="OBJECT")
    else:
        for obj in meshes:
            bpy.context.view_layer.objects.active=obj; bpy.ops.object.select_all(action="DESELECT"); obj.select_set(True); bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
            if op=="repair": bpy.ops.mesh.remove_doubles(); bpy.ops.mesh.normals_make_consistent(inside=False)
            elif op=="smooth": bpy.ops.mesh.vertices_smooth(repeat=int(scene.get("iterations",1)))
            elif op in ("optimize","retopology"):
                bpy.ops.object.mode_set(mode="OBJECT"); mod=obj.modifiers.new("Studio Decimate", "DECIMATE"); mod.ratio=max(0.05,min(1.0,float(scene.get("ratio",0.5)))); bpy.ops.object.modifier_apply(modifier=mod.name); bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.object.mode_set(mode="OBJECT")
    cfg["scene"]["meshReport"]=report
    print("STUDIO_MESH_REPORT:"+json.dumps(report))
    out=cfg["output"]; os.makedirs(os.path.dirname(out), exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=out); bpy.ops.export_scene.gltf(filepath=os.path.splitext(out)[0]+".glb", export_format="GLB")
else:
    out=cfg["output"]; os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=out if cfg["action"]=="project" or cfg["format"]=="BLEND" else out+".blend")
    fmt=(cfg["format"] or "BLEND").upper()
    if fmt=="GLB": bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
    elif fmt=="GLTF": bpy.ops.export_scene.gltf(filepath=out, export_format="GLTF_SEPARATE")
    elif fmt=="FBX": bpy.ops.export_scene.fbx(filepath=out)
    elif fmt=="OBJ": bpy.ops.wm.obj_export(filepath=out)
    elif fmt!="BLEND": raise RuntimeError("Unsupported export format: "+fmt)
''' % payload


async def run_blender_job(db: AsyncDatabase, job_id: str) -> None:
    """Run a Blender task and persist terminal job status and any generated asset."""
    job_oid = ObjectId(job_id)
    job = await db.jobs.find_one({"_id": job_oid})
    if not job:
        return
    now = utc_now()
    await db.jobs.update_one({"_id": job_oid, "status": {"$in": ["queued", "pending"]}}, {"$set": {"status": "processing", "progress": 5, "startedAt": now, "updatedAt": now}})
    stage_name = job.get("jobType") if job.get("jobType") in {"image_upload", "image_analysis", "model_generation", "mesh_editing", "materials", "rigging", "animation", "lighting", "rendering", "export"} else None
    if stage_name:
        await db.workflowStages.update_one({"projectId": job["projectId"], "stageName": stage_name}, {"$set": {"status": "processing", "updatedAt": now}})
    job = await db.jobs.find_one({"_id": job_oid})
    if not job or job.get("status") == "cancelled":
        return
    binary = _blender_binary()
    if not binary:
        await _finish(db, job_oid, "failed", error={"code": "BLENDER_NOT_CONFIGURED", "message": "Set BLENDER_EXECUTABLE to a Blender 5 executable to run this job."})
        return
    try:
        data = job.get("input", {})
        action = data.get("action", "export")
        fmt = str(data.get("format", "BLEND")).upper()
        source = None
        source_asset_id = data.get("sourceAssetId")
        if source_asset_id and ObjectId.is_valid(source_asset_id):
            asset = await db.assets.find_one({"_id": ObjectId(source_asset_id), "projectId": job["projectId"], "userId": job["userId"]})
            if not asset:
                raise ValueError("The source asset does not exist in this project")
            source = (STORAGE_ROOT / asset["storageKey"]).resolve()
            if not source.is_relative_to(STORAGE_ROOT) or not source.is_file():
                raise ValueError("The source asset file is unavailable")
        project_dir = STORAGE_ROOT / str(job["userId"]) / str(job["projectId"])
        project_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{job_id}.{fmt.lower()}" if action not in {"render", "render_animation"} else f"{job_id}.{'mp4' if action == 'render_animation' else 'png'}"
        output = project_dir / filename
        with tempfile.NamedTemporaryFile("w", suffix=".py", encoding="utf-8", delete=False) as script:
            script.write(_bpy_script(action, output, source, fmt, data.get("scene", {})))
            script_path = script.name
        try:
            proc = await asyncio.create_subprocess_exec(binary, "--background", "--disable-autoexec", "--python", script_path, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
            communicate = asyncio.create_task(proc.communicate())
            deadline = asyncio.get_running_loop().time() + max(30, min(int(data.get("timeoutSeconds", 1800)), 3600))
            while not communicate.done():
                remaining = deadline - asyncio.get_running_loop().time()
                if remaining <= 0:
                    proc.kill()
                    await communicate
                    raise asyncio.TimeoutError
                done, _ = await asyncio.wait({communicate}, timeout=min(2, remaining))
                if done:
                    break
                current = await db.jobs.find_one({"_id": job_oid}, {"status": 1})
                if not current or current.get("status") == "cancelled":
                    proc.terminate()
                    try:
                        await asyncio.wait_for(communicate, timeout=10)
                    except asyncio.TimeoutError:
                        proc.kill()
                        await communicate
                    return
            logs, _ = communicate.result()
        finally:
            Path(script_path).unlink(missing_ok=True)
        log_text = logs.decode("utf-8", "replace")[-20000:]
        if proc.returncode != 0 or not output.exists():
            raise RuntimeError((log_text[-3000:] or f"Blender exited with status {proc.returncode}"))
        stat = output.stat()
        mesh_report = None
        for line in log_text.splitlines():
            if line.startswith("STUDIO_MESH_REPORT:"):
                mesh_report = json.loads(line[len("STUDIO_MESH_REPORT:"):])
        metadata = {"jobId": job_id, "blenderLog": log_text[-4000:]}
        if mesh_report:
            metadata["meshReport"] = mesh_report
        asset = {"projectId": job["projectId"], "userId": job["userId"], "assetType": "render" if action in {"render", "render_animation"} else "blender_project" if fmt == "BLEND" else "model", "fileName": output.name, "storageKey": str(output.relative_to(STORAGE_ROOT)).replace("\\", "/"), "format": "MP4" if action == "render_animation" else fmt, "mimeType": "video/mp4" if action == "render_animation" else "image/png" if action == "render" else "application/octet-stream", "fileSize": stat.st_size, "metadata": metadata, "version": 1, "createdAt": utc_now()}
        asset_result = await db.assets.insert_one(asset)
        asset["_id"] = asset_result.inserted_id
        if mesh_report and source_asset_id:
            await db.assets.update_one({"_id": ObjectId(source_asset_id)}, {"$set": {"metadata.meshReport": mesh_report, "metadata.lastMeshJobId": job_id}})
        await _finish(db, job_oid, "completed", output={"assetId": str(asset_result.inserted_id), "fileName": output.name, "format": fmt, "fileSize": stat.st_size, "logs": log_text[-20000:]}, progress=100)
    except asyncio.TimeoutError:
        await _finish(db, job_oid, "failed", error={"code": "BLENDER_TIMEOUT", "message": "Blender exceeded the configured job timeout."})
    except Exception as exc:
        logger.exception("Blender job %s failed", job_id)
        await _finish(db, job_oid, "failed", error={"code": "BLENDER_JOB_FAILED", "message": str(exc)[:2000]})


async def _finish(db: AsyncDatabase, job_id: ObjectId, status: str, output: dict | None = None, error: dict | None = None, progress: int = 100) -> None:
    now = utc_now()
    changes: dict[str, Any] = {"status": status, "progress": progress, "completedAt": now, "updatedAt": now}
    if output is not None:
        changes["output"] = output
    if error is not None:
        changes["error"] = error
    await db.jobs.update_one({"_id": job_id, "status": {"$ne": "cancelled"}}, {"$set": changes})
    job = await db.jobs.find_one({"_id": job_id})
    stage_name = job.get("jobType") if job and job.get("jobType") in {"image_upload", "image_analysis", "model_generation", "mesh_editing", "materials", "rigging", "animation", "lighting", "rendering", "export"} else None
    if stage_name and job.get("status") != "cancelled":
        await db.workflowStages.update_one({"projectId": job["projectId"], "stageName": stage_name}, {"$set": {"status": job.get("status", status), "updatedAt": now}})
