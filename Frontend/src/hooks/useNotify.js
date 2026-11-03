import { useStudioStore } from "../store/useStudioStore";
export function useNotify() {
  return useStudioStore((s) => s.notify);
}
