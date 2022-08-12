import styles from './MyComments.module.css';
import { Oval } from 'react-loader-spinner';
import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';

import { useAuthContext } from '../../contexts/AuthContext';
import * as commentService from '../../services/commentService';


const MyComments = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthContext();
    const [comments, setComments] = useState([]);

    useEffect(() => {
        setIsLoading(true);

        (async () => {
            const userId = user._id
            const recipieComments = await commentService.getByUserId(userId);
            setComments(recipieComments);

            setIsLoading(false);
        })();

    }, [user._id]);

    const removeClickHandler = (_id) => {
        commentService.remove(_id);
        setComments(comment => comment.filter(x => x._id !== _id));

    };

    return (
        <div className={styles.home}>

            <div className={styles.menuList}>
                <div className={styles.menufavorites}>
                    <Link to={"/user/favorites"}>
                        Любими рецепти
                    </Link>
                </div>
                <div className={styles.menuMyRecipies}>
                    <Link to={"/user/myRecipies"}>
                        Моите рецепти
                    </Link>
                </div>
                <div className={styles.menuMyComments}>
                    <Link to={"/user/myComments"}>
                        Моите коментари
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
                    <h1>Моите коментари</h1>
                    <div className={styles.detailsComments}>
                        {comments.length > 0
                        ? <ul>
                        {comments?.map(x =>
                            <li key={x._id} className={styles.comment}>
                                <div>{x.recipie.title}</div>
                                <p>
                                    {x.text}
                                    <button className={styles.commentDeleteBtn} onClick={() => removeClickHandler(x._id)}>x</button>
                                </p>

                            </li>
                        )}
                    </ul>
                    :<h3 className={styles.noArticles}>Няма намерени коментари</h3>
                    }
                   
                    </div>
                </section>
            }
        </div>

    );
};

export default MyComments;