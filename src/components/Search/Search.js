import styles from './Search.module.css'

import { useState, useContext, useEffect } from 'react';
import { SearchContext } from '../../contexts/SearchContext';
import{ useNavigate } from 'react-router-dom';



const Search = ({
    menu
}) => {

    let { setSearch } = useContext(SearchContext);
    const [newSearch, setNewSearch] = useState('');
    const [navBtnClass, setNavBtnClass] = useState(styles.navBtnClose);
    const navigate = useNavigate();

    useEffect(() => {
        if(menu === "close") {
            setNavBtnClass(styles.navBtnOpen);
        } else if(menu === "open") {
            setNavBtnClass(styles.navBtnClose);
        }
        
    }, [menu]);

    const onClickHandler = (e) => {
        e.preventDefault();
        const searchData = Object.fromEntries(new FormData(e.target));
        setSearch(searchData);
        setNewSearch('');
        navigate('/catalog');
    };

    const onChange = (e) => {
        setNewSearch(e.target.value);
        //setSearch({search: e.target.value});
    };

    const clearHandler = (e) => {
        e.preventDefault();
        setNewSearch('');
    };

    const searchHandler = (e) => {
        e.preventDefault();
        setSearch({search: newSearch});
        setNewSearch('');
        navigate('/catalog');
    };

    return (
        <div className={navBtnClass}>
            <form onSubmit={onClickHandler}>
                <input
                    type="text"
                    id='search'
                    className={styles.searchInput}
                    placeholder='Търсене...'
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