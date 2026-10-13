import API_URL_AUTH from "./auth.service";

const BASE_URL = "/api/access-requests";

export const fetchAccessRequestNotifications = async () => {
  const { data } = await API_URL_AUTH.get(`${BASE_URL}/notifications`);
  return data;
};