let accessToken = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (value) => { accessToken = value || null; };
export const clearAccessToken = () => { accessToken = null; };
