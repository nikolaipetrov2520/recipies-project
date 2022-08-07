import styles from './Catalog.module.css';
import { Oval } from 'react-loader-spinner';
import { useSearchParams, Link } from 'react-router-dom';

import { useState, useEffect, useContext } from "react";
import { SearchContext } from '../../contexts/SearchContext';

import RecipiesItem from "./RecipiesItem/RecipiesItem";
import * as recipieService from '../../services/recipieService'

const Catalog = () => {
    const [recipies, setRecipies] = useState([]);
    const [recipieCount, setRecipieCount] = useState(0);
    const [newPage, setNewPage] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const { search } = useContext(SearchContext);
    const [isLoading, setIsLoading] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        setIsLoading(true);
        setNewPage((parseInt(searchParams.get('page')) - 1) * 6 || 0);
        setCurrentPage(parseInt(searchParams.get('page') || 1));
        recipieService.getCount()
            .then(result => {
                setRecipieCount(result);
                setPageCount(Math.ceil(result / 6));
            });

        recipieService.getAll(newPage)
            .then(result => {
                let filter = "";
                if (search !== "") {
                    filter = search.search.toString().toLowerCase();
                    result = result.filter(x => x.title.toLowerCase().includes(filter) || x.category.toLowerCase().includes(filter))
                }
                setRecipies(result);
                setIsLoading(false);
            });

    }, [search, newPage, searchParams, currentPage, pageCount]);

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
                : <><div className={styles.pagination}>
                    <ul className={styles.paginationList}>
                        <li className={styles.activeArrow}>
                            <Link to={'?page=1'}>
                                <i className="fa-solid fa-angles-left"></i>
                            </Link>
                        </li>
                        {currentPage < 2
                            ? <li className={styles.inactiveArrow}>
                                <Link to={'?page=1'}>
                                    <i className="fa-solid fa-chevron-left"></i>
                                </Link>
                            </li>
                            : <li className={styles.activeArrow}>
                                <Link to={`?page=${currentPage - 1}`}>
                                    <i className="fa-solid fa-chevron-left"></i>
                                </Link>
                            </li>
                        }

                        {pageCount > 2
                            ? <>
                                <li>
                                    <Link to={`?page=${currentPage - 1}`}>
                                        {currentPage - 1}
                                    </Link>
                                </li>
                                <li className={styles.active}>
                                    <Link to={`?page=${currentPage}`}>
                                        {currentPage}
                                    </Link>
                                </li>
                                <li>
                                    <Link to={`?page=${currentPage + 1}`}>
                                        {currentPage + 1}
                                    </Link>
                                </li>
                            </>
                            : <>
                                {currentPage > 1
                                    ? <li>
                                        <Link to={`?page=${currentPage - 1}`}>
                                            {currentPage - 1}
                                        </Link>
                                    </li>
                                    : <div></div>
                                }
                                <li className={styles.active}>
                                    <Link to={`?page=${currentPage}`}>
                                        {currentPage}
                                    </Link>
                                </li>
                                {currentPage + 1 <= pageCount
                                    ? <li>
                                        <Link to={`?page=${currentPage + 1}`}>
                                            {currentPage + 1}
                                        </Link>
                                    </li>
                                    : <div></div>
                                }

                            </>
                        }
                        {currentPage >= pageCount
                            ? <li className={styles.inactiveArrow}>
                                <Link to={`?page=${currentPage}`}>
                                    <i className="fa-solid fa-chevron-right"></i>
                                </Link>
                            </li>
                            : <li className={styles.activeArrow}>
                                <Link to={`?page=${currentPage + 1}`}>
                                    <i className="fa-solid fa-chevron-right"></i>
                                </Link>
                            </li>
                        }

                        <li className={styles.activeArrow}>
                            <Link to={`?page=${pageCount}`}>
                                <i className="fa-solid fa-angles-right"></i>
                            </Link>
                        </li>
                    </ul>
                </div>
                    <div>
                        
                        <section className={styles.catalogPage}>
                        <div className={styles.recipieCount}>Показване на {(currentPage - 1) * 6 + 1 } - {((currentPage - 1) * 6 + 6) < recipieCount ?(currentPage - 1) * 6 + 6 : recipieCount} от общо {recipieCount}
                            </div>
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
                </>
            }
        </div>

    );

};

export default Catalog;