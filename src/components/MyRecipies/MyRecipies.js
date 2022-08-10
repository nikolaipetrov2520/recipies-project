import styles from './MyRecipies.module.css';
import { Oval } from 'react-loader-spinner';
import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';

import { useAuthContext } from '../../contexts/AuthContext';
import * as myRecipiesService from '../../services/myRecipiesService';
import RecipiesItem from "../Catalog/RecipiesItem/RecipiesItem";


const Favorites = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthContext();
    const [recipies, setRecipies] = useState([]);

    useEffect(() => {
        setIsLoading(true);

        (async () => {
            const recipieDetails = await myRecipiesService.getByUserId(user._id);
            setRecipies(recipieDetails);
            setIsLoading(false);
        })();


    }, [user._id]);

    return (
        <div className={styles.home}>
            <div className={styles.menuList}>
                <div className={styles.menufavorites}>
                    <Link to={"/user/favorites"}>
                        Любими рецепти
                    </Link>
                </div>
                <div className={styles.menuMyRecipies}>
                    <Link to={"user/myRecipies"}>
                        Моите рецепти
                    </Link>
                </div>
            </div>

            {isLoading
                ? <div className={styles.loader}>
                    <Oval
                        color="#3fa37f"
                        height="100"
                        width="100"
                    />
                </div>
                : <section className={styles.catalogPage}>
                    {recipies.length > 0
                        ? recipies.map(x => <RecipiesItem key={x._id} recipie={x} />)
                        : <h3 className={styles.noArticles}>Няма намерени рецепти</h3>
                    }
                </section>
            }
        </div>

    );
};

export default Favorites;