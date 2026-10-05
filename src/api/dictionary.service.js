import API_URL_AUTH from "./auth.service";

export const searchCountries = async (query = '') => {
  try {
    const response = await API_URL_AUTH.get('/api/countries', {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw error;
  }
};

export const searchCurrencies = async (query = '') => {
  try {
    const response = await API_URL_AUTH.get('/api/currencies', {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching currencies:', error);
    throw error;
  }
};