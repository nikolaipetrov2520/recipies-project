import * as request from "./requester";

const baseUrl = 'http://localhost:3030/data/recipies';

export const getByUserId = (UserId) => {
    const search = encodeURIComponent(`_ownerId="${UserId}"`);

    return request.get(`${baseUrl}?where=${search}`);
    
}