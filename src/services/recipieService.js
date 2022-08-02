import * as request from "./requester";

const baseUrl = 'http://localhost:3030/data/recipies';

export const getAll = () => request.get(baseUrl);

export const getOne = (recipieId) => request.get(`${baseUrl}/${recipieId}`);

export const getLatest = () => request.get(`${baseUrl}?sortBy=_createdOn%20desc`);

export const create = (recipieData) => request.post(baseUrl, recipieData);

// export const edit = (gameId, gameData) => request.put(`${baseUrl}/${gameId}`, gameData);

// export const remove = (gameId) => request.del(`${baseUrl}/${gameId}`);