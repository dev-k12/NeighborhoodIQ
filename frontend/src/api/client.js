import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 35000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getLocalities = async (params = {}) => {
  const response = await api.get('/localities', { params });
  return response.data;
};

export const getLocalityById = async (id) => {
  const response = await api.get(`/localities/${id}`);
  return response.data;
};

export const lookupLocality = async (query) => {
  const response = await api.get('/localities/lookup', {
    params: { query },
  });
  return response.data;
};

export const recalculateScores = async (weights) => {
  const response = await api.post('/score/recalculate', { weights });
  return response.data;
};

export const compareLocalities = async (ids) => {
  const idStr = Array.isArray(ids) ? ids.join(',') : ids;
  const response = await api.get('/compare', {
    params: { ids: idStr },
  });
  return response.data;
};

export const getCorrelation = async () => {
  const response = await api.get('/insights/correlation');
  return response.data;
};

export const getClusters = async () => {
  const response = await api.get('/insights/clusters');
  return response.data;
};

export const getLeaderboard = async (limit = 10, city = null) => {
  const params = { limit };
  if (city && city !== 'All') params.city = city;
  const response = await api.get('/insights/leaderboard', { params });
  return response.data;
};

export const getEda = async () => {
  const response = await api.get('/insights/eda');
  return response.data;
};

export const getDefaultWeights = async () => {
  const response = await api.get('/insights/weights');
  return response.data;
};

// Pan-India Cascading Geographic Search Engine APIs
export const getGeoStates = async () => {
  const response = await api.get('/geo/states');
  return response.data;
};

export const getGeoDistricts = async (state) => {
  const response = await api.get('/geo/districts', { params: { state } });
  return response.data;
};

export const getGeoCities = async (state, district) => {
  const response = await api.get('/geo/cities', { params: { state, district } });
  return response.data;
};

export const scoreGeoLocality = async (name, district, state) => {
  const response = await api.post('/geo/score-locality', { name, district, state });
  return response.data;
};

export const batchScoreDistrict = async (state, district) => {
  const response = await api.post('/geo/batch-score-district', { state, district });
  return response.data;
};

export const getDistrictSummary = async (state, district) => {
  const response = await api.get('/geo/district-summary', { params: { state, district } });
  return response.data;
};

export const getDistinctCities = async () => {
  const response = await api.get('/localities/cities');
  return response.data;
};

export default api;
