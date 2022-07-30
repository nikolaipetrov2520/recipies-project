import styles from './Catalog.module.css';

import { useContext } from "react";

import { RecipiesContext } from "../../contexts/RecipiesContext";
import RecipiesItem from "./RecipiesItem/RecipiesItem";

const Catalog = () => {
    const { recipies } = useContext(RecipiesContext);
    
    return (
        <section className={styles.catalogPage}>
            <h1>Всички рецепти</h1>

            {recipies.length > 0
                ? recipies.map(x => <RecipiesItem key={x._id} recipie={x} />)
                : <h3 className={styles.noArticles}>Все още няма рецепри</h3>
            }
        </section>
    );
};

export default Catalog;