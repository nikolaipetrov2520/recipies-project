import { createContext, useReducer, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import * as recipieService from '../services/recipieService';

export const RecipiesContext = createContext();

const recipieReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_RECIPIE':
            return action.payload.map(x => ({ ...x, comments: [] }));
        case 'ADD_GAME':
            return [...state, action.payload];
        case 'FETCH_GAME_DETAILS':
        case 'EDIT_GAME':
            return state.map(x => x._id === action.gameId ? action.payload : x);
        case 'ADD_COMMENT':
            return state.map(x => x._id === action.gameId ? { ...x, comments: [...x.comments, action.payload] } : x);
        case 'REMOVE_GAME':
            return state.filter(x => x._id !== action.gameId);
        default:
            return state;
    }
};

export const RecipiesProvider = ({
    children,
}) => {
    const navigate = useNavigate();
    const [recipies, dispatch] = useReducer(recipieReducer, []);

    useEffect(() => {
        recipieService.getAll()
            .then(result => {
                const action = {
                    type: 'ADD_RECIPIE',
                    payload: result
                };

                dispatch(action);
            });
    }, []);

    // const selectGame = (gameId) => {
    //     return games.find(x => x._id === gameId) || {};
    // };

    // const fetchGameDetails = (gameId, gameDetails) => {
    //     dispatch({
    //         type: 'FETCH_GAME_DETAILS',
    //         payload: gameDetails,
    //         gameId,
    //     })
    // }

    // const addComment = (gameId, comment) => {
    //     dispatch({
    //         type: 'ADD_COMMENT',
    //         payload: comment,
    //         gameId
    //     });
    //     // setGames(state => {
    //     //     const game = state.find(x => x._id == gameId);

    //     //     const comments = game.comments || [];
    //     //     comments.push(comment)

    //     //     return [
    //     //         ...state.filter(x => x._id !== gameId),
    //     //         { ...game, comments },
    //     //     ];
    //     // });
    // };

    const recipieAdd = (recipieData) => {
        dispatch({
            type: 'ADD_RECIPIE',
            payload: recipieData,
        })

        navigate('/catalog');
    };

    // const gameEdit = (gameId, gameData) => {
    //     dispatch({
    //         type: 'EDIT_GAME',
    //         payload: gameData,
    //         gameId,
    //     });
    // };

    // const gameRemove = (gameId) => {
    //     dispatch({
    //         type: 'REMOVE_GAME',
    //         gameId
    //     })
    // }
    return (
        <RecipiesContext.Provider value={{
            recipies,
             recipieAdd,
            // gameEdit,
            // addComment,
            // fetchGameDetails,
            // selectGame,
            // gameRemove
        }}>
            {children}
        </RecipiesContext.Provider>
    );
}
