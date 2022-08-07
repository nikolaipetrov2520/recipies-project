import * as request from "./requester";

const baseUrl = 'http://localhost:3030/data/likes';

export const create = (recipieId) =>
    request.post(baseUrl, { recipieId });

export const getByRecipieId = (recipieId) => {
    const search = encodeURIComponent(`recipieId="${recipieId}"`);

    return request.get(`${baseUrl}?where=${search}`);
}

export const remove = (likeId) => request.del(`${baseUrl}/${likeId}`);