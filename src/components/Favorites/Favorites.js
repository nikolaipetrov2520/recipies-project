import styles from './Favorites.module.css';
import { Oval } from 'react-loader-spinner';
import { useState, useEffect } from "react";

import { useAuthContext } from '../../contexts/AuthContext';
import * as favoriteService from '../../services/favoriteService';
import RecipiesItem from "../Catalog/RecipiesItem/RecipiesItem";


const Favorites = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthContext();
    const [recipies, setRecipies] = useState([]);

    useEffect(() => {
        setIsLoading(true);

        (async () => {
            const recipieDetails = await favoriteService.getfavotitsByUserId(user._id);
            setRecipies(recipieDetails);
            setIsLoading(false);
            console.log(recipieDetails);
        })();
        
        
    }, [user._id]);

    return (
        <div className={styles.home}>

            {isLoading
                ? <div className={styles.loader}>
                    <Oval
                        color="#3fa37f"
                        height="100"
                        width="100"
                    />
                </div>
                : <>
                    <div>
                        <section className={styles.catalogPage}>

                            {recipies.length > 0
                                ? recipies.map(x => <RecipiesItem key={x.recipie._id} recipie={x.recipie} />)
                                : <h3 className={styles.noArticles}>Няма намерени рецепти</h3>
                            }
                        </section>
                    </div>
                </>
            }
        </div>

    );
};

export default Favorites;