import * as request from "./requester";

const baseUrl = 'http://localhost:3030/data/comments';

export const create = (recipieId, comment) =>
    request.post(baseUrl, { recipieId, text: comment });

export const getByRecipieId = (recipieId) => {
    const search = encodeURIComponent(`recipieId="${recipieId}"`);
    const relations = encodeURIComponent(`user=_ownerId:users`);

    return request.get(`${baseUrl}?where=${search}&load=${relations}`);
}

export const remove = (_id) => request.del(`${baseUrl}/${_id}`);

export const getByUserId = (userId) => {
    const search = encodeURIComponent(`_ownerId="${userId}"`);
    const relations = encodeURIComponent(`recipie=recipieId:recipies`);

    return request.get(`${baseUrl}?where=${search}&load=${relations}`);
}