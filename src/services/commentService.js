import * as request from "./requester";

const baseUrl = 'http://localhost:3030/data/comments';

export const create = (recipieId, comment) =>
    request.post(baseUrl, { recipieId, text: comment });

export const getByRecipieId = (recipieId) => {
    const relations = encodeURIComponent(`user=_ownerId:users`);
    const search = encodeURIComponent(`_recepieId="${recipieId}"`);

    return request.get(`${baseUrl}?where=${search}`);
}