import styles from './Catalog.module.css';

import { useState, useEffect, useContext } from "react";
import { SearchContext } from '../../contexts/SearchContext';

import RecipiesItem from "./RecipiesItem/RecipiesItem";
import * as recipieService from '../../services/recipieService'

const Catalog = () => {
    const [ recipies, setRecipies  ] = useState([]);
    const { search } = useContext(SearchContext);

    useEffect(() => {
        recipieService.getAll()
            .then(result => {
                let filter = "";
                if(search.search.search !== undefined){
                    filter = search.search.toString().toLowerCase();
                    result = result.filter(x => x.title.toLowerCase().includes(filter) || x.category.toLowerCase().includes(filter))
                }
                setRecipies(result);
            });
    }, [search.search]);
    
    return (
        
        <section className={styles.catalogPage}>
            <h1>Всички рецепти</h1>

            {recipies.length > 0
                ? recipies.map(x => <RecipiesItem key={x._id} recipie={x} />)
                : <h3 className={styles.noArticles}>Няма намерени рецепти</h3>
            }
        </section>
    );
};

export default Catalog;