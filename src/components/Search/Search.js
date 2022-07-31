import styles from './Search.module.css'

import { useContext} from 'react';
import { SearchContext } from '../../contexts/SearchContext';



const Search = () => {

    let {setSearch} = useContext(SearchContext);

    const onClickHandler = (e) =>{
        e.preventDefault();
        let searchData = Object.fromEntries(new FormData(e.target));
        setSearch(searchData);
        searchData = "";
    };

    return (
    <div className={styles.search}>
        <form onSubmit={onClickHandler}>
        <input
            type="text"
            id='search'
            className={styles.searchInput}
            placeholder='search'
            name='search'>
        </input>
        <button className={styles.searchButton}><img src='/search.png' alt='search' width={"18px"}/></button>
        </form>
        
    </div>)
};

export default Search;