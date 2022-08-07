import styles from './Catalog.module.css';
import { Oval } from 'react-loader-spinner';

import { useState, useEffect, useContext } from "react";
import { SearchContext } from '../../contexts/SearchContext';

import RecipiesItem from "./RecipiesItem/RecipiesItem";
import * as recipieService from '../../services/recipieService'

const Catalog = () => {
    const [recipies, setRecipies] = useState([]);
    const { search } = useContext(SearchContext);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        recipieService.getAll()
            .then(result => {
                let filter = "";
                if (search !== "") {
                    filter = search.search.toString().toLowerCase();
                    result = result.filter(x => x.title.toLowerCase().includes(filter) || x.category.toLowerCase().includes(filter))
                }
                setRecipies(result);
                setIsLoading(false);
            });
    }, [search]);

    return (
        <div className={styles.home}>
            {isLoading
                ? <div className={styles.loader}>
                    <Oval
                        color="#3fa37f" 
                        height = "100"
                        width = "100"
                    />
                </div>
                : <div>
                    <section className={styles.catalogPage}>
                        {search.search.search === undefined || search.search === ""
                        ? <h1>Всички рецепти</h1>
                        : <h1>Търсене за "{search.search}"</h1>
                        }
                        
                        {recipies.length > 0
                            ? recipies.map(x => <RecipiesItem key={x._id} recipie={x} />)
                            : <h3 className={styles.noArticles}>Няма намерени рецепти</h3>
                        }
                    </section>
                </div>
            }
        </div>
    );
};

export default Catalog;