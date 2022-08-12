import * as request from "./requester";

const baseUrl = 'http://localhost:3030/data/favorites';


export const getfavotitsByUserId = (id) => {

    const search = encodeURIComponent(`_ownerId="${id}"`);
    const relations = encodeURIComponent(`recipie=recipieId:recipies`);

    return request.get(`${baseUrl}?where=${search}&sortBy=_createdOn%20desc&load=${relations}`);
}

export const create = (recipieId) => request.post(baseUrl, { recipieId });

export const remove = (_id) => request.del(`${baseUrl}/${_id}`);

export const getByUserId = (UserId) => {
    const search = encodeURIComponent(`_ownerId="${UserId}"`);

    return request.get(`${baseUrl}?where=${search}`);
    
}

export const getByRecepieId = (recepieId) => {
    const search = encodeURIComponent(`recipieId="${recepieId}"`);

    return request.get(`${baseUrl}?where=${search}`);
    
}