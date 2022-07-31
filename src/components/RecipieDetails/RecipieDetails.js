import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import styles from './RecipieDetails.module.css';

import * as recipieService from '../../services/recipieService';
import * as commentService from '../../services/commentService';

const RecipieDetails = () => {
    const navigate = useNavigate();
    const { recipieId } = useParams();
    const [recipie, setRecipie] = useState({})
    const [comments, setcomments] = useState([])

    useEffect(() => {
        (async () => {
            const recipieDetails = await recipieService.getOne(recipieId);
            setRecipie(recipieDetails)
            const recipieComments = await commentService.getByRecipieId(recipieId);
            console.log(recipieComments);
            setcomments(recipieComments);
            //fetchRecipieDetails(recipieId, { ...recipieDetails, comments: recipieComments.map(x => `${x.user.email}: ${x.text}`) });
        })();
    }, [])

    // const addCommentHandler = (e) => {
    //     e.preventDefault();
    //     const formData = new FormData(e.target);

    //     const comment = formData.get('comment');

    //     commentService.create(recipieId, comment)
    //         .then(result => {
    //             addComment(recipieId, comment);
    //         });
    // };

    // const recipieDeleteHandler = () => {
    //     const confirmation = window.confirm('Are you sure you want to delete this game?');

    //     if (confirmation) {
    //         gameService.remove(gameId)
    //             .then(() => {
    //                 gameRemove(gameId);
    //                 navigate('/catalog');
    //             })
    //     }
    // }

    return (
        <section id={styles.recipieDetails}>
            <h1>{recipie.title}</h1>
            <div className={styles.infoSection}>
                <div className={styles.recipieHeader}>
                    <div className={styles.img}>
                        <img className={styles.recipieImg} src={recipie.image} />
                    </div>
                    <div className={styles.info}>
                        <span className={styles.category}>Категория: {recipie.category}</span>
                        <div className={styles.info}>
                            <div className={styles.type}>
                                <i className="fa-solid fa-clock-rotate-left"></i>
                                <div>Време за подготовка</div>
                                <div>{recipie.preparationTime}</div>
                            </div>
                            <div className={styles.type}>
                                <i className="fa-solid fa-clock-rotate-left"></i>
                                <div>Време за приготвяне</div>
                                <div>{recipie.neededTime}</div>
                            </div>
                            <div className={styles.type}>
                                <div>Порции</div>
                                <div>{recipie.portions}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <h2>Съставки</h2>
                <ul className={styles.ingredients}>
                    {recipie.ingredients?.map(x =>
                        <li key={x.name}>
                            <i className="fa-solid fa-cookie-bite"></i><p>{x.name}</p><p>{x.quantity}</p>
                        </li>
                    )}
                </ul>
                <h2>Начин на приготвяне</h2>
                <p className={styles.text}>
                    {recipie.preparation}
                </p>

                <div className={styles.detailsComments}>
                    <h2>Коментари</h2>
                    <ul>
                        {comments?.map(x =>
                            <li key={x._id} className={styles.comment}>
                                <p>{x.text}</p>
                            </li>
                        )}
                    </ul>

                    {!comments &&
                        <p className={styles.noComment}>No comments.</p>
                    }
                </div>

                <div className={styles.buttons}>
                    <Link to={`/games/${recipieId}/edit`} className={styles.button}>
                        Edit
                    </Link>
                    <button
                        // onClick={recipieDeleteHandler}
                        className={styles.button}
                    >
                        Delete
                    </button>
                </div>
            </div>
            <div className={styles.commentBox}>
            <article className={styles.createComment}>
                <label>Add new comment:</label>
                <form className={styles.form}
                //  onSubmit={addCommentHandler}
                >
                    <textarea
                        name="comment"
                        placeholder="Comment......"
                    />

                    <input
                        className={styles.btnSubmit}
                        type="submit"
                        value="Add Comment"
                    />
                </form>
            </article>
            </div>
            
        </section>
    );
};

export default RecipieDetails;