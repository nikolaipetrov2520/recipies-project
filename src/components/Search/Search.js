import styles from './Search.module.css'

import { useState, useContext } from 'react';
import { SearchContext } from '../../contexts/SearchContext';



const Search = () => {

    let { setSearch } = useContext(SearchContext);
    const [newSearch, setNewSearch] = useState('');

    const onClickHandler = (e) => {
        e.preventDefault();
        let searchData = Object.fromEntries(new FormData(e.target));
        setSearch(searchData);
        setNewSearch('');
    };

    const onChange = (e) => {
        setNewSearch(e.target.value);
    };

    const clearHandler = (e) => {
        e.preventDefault();
        setNewSearch('');
    };

    const searchHandler = (e) => {
        e.preventDefault();
        setSearch(newSearch);
        setNewSearch('');
    };

    return (
        <div className={styles.search}>
            <form onSubmit={onClickHandler}>
                <input
                    type="text"
                    id='search'
                    className={styles.searchInput}
                    placeholder='search'
                    value={newSearch}
                    onChange={onChange}
                    name='search'>
                </input>
            </form>
            <button
                    className={styles.searchButton}
                    onClick={searchHandler}
                >
                    <img src='/search.png' alt='search' width={"18px"} />
                </button>
            {newSearch.length > 0 && <button
                    className={styles.searchClear}
                    onClick={clearHandler}
                >
                    x
                </button>}

        </div>)
};

export default Search;