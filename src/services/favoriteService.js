import * as request from "./requester";

const baseUrl = 'http://localhost:3030/data/favorites';


export const getfavotitsByUserId = (id) => {

    const search = encodeURIComponent(`_ownerId="${id}"`);
    const relations = encodeURIComponent(`recipie=recipieId:recipies`);

    return request.get(`${baseUrl}?where=${search}&load=${relations}`);
}

export const create = (recipieId) => request.post(baseUrl, { recipieId });

export const remove = (favId) => request.del(`${baseUrl}/${favId}`);

export const getByUserId = (UserId) => {
    const search = encodeURIComponent(`_ownerId="${UserId}"`);

    return request.get(`${baseUrl}?where=${search}`);
    
}