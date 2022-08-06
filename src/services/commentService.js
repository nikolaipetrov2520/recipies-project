import * as request from "./requester";

const baseUrl = 'http://localhost:3030/data/comments';

export const create = (recipieId, comment) =>
    request.post(baseUrl, { recipieId, text: comment });

export const getByRecipieId = (recipieId) => {
    const search = encodeURIComponent(`recipieId="${recipieId}"`);

    return request.get(`${baseUrl}?where=${search}`);
}