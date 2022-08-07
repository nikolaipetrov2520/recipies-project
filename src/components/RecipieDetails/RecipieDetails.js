import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import styles from './RecipieDetails.module.css';
import { Oval } from 'react-loader-spinner';

import * as recipieService from '../../services/recipieService';
import * as commentService from '../../services/commentService';

import { useAuthContext } from '../../contexts/AuthContext';

const RecipieDetails = () => {
    const navigate = useNavigate();
    const { recipieId } = useParams();
    const [recipie, setRecipie] = useState({});
    const [comments, setcomments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const { user } = useAuthContext();
    const [isLoading, setIsLoading] = useState(false);

    const isOwner = recipie._ownerId === user._id;

    useEffect(() => {
        setIsLoading(true);
        (async () => {
            const recipieDetails = await recipieService.getOne(recipieId);
            setRecipie(recipieDetails)
            const recipieComments = await commentService.getByRecipieId(recipieId);
            setcomments(recipieComments);
            setIsLoading(false);
        })();
    }, [recipieId])

    const addCommentHandler = (e) => {
        e.preventDefault();
        if(newComment !== ""){
            commentService.create(recipieId, newComment)
            .then(result => {
                setcomments(comment => [...comment, result]);
                setNewComment('');
            });
        }
       
    };

    const onChangeComment = (e) => {
        setNewComment(e.target.value);
    };

    const recipieDeleteHandler = () => {
        if (!isOwner) {
            navigate('/catalog');
        }

        const confirmation = window.confirm('Сигурни ли сте че искате да изтриете рецептата');

        if (confirmation) {
            recipieService.remove(recipieId)
                .then(() => {
                    navigate('/catalog');
                })
        }
    }

    return (
        <section id={styles.recipieDetails}>
            {isLoading
                ? <div className={styles.loader}>
                    <Oval
                        color="#3fa37f"
                        height="100"
                        width="100"
                    />
                </div>
                : <div>
                    <h1>{recipie.title}</h1>
                    <div className={styles.infoSection}>
                        <div className={styles.recipieHeader}>
                            <div className={styles.img}>
                                <img className={styles.recipieImg} src={recipie.image} alt="Рецепта" />
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
                                    <i className="fa-solid fa-cookie-bite"></i><p>{x.name}</p><p>-</p><p>{x.quantity}</p>
                                </li>

                            )}
                            {recipie.ingredients?.lenght % 2 !== 0
                                && <li>
                                    <i></i><p></p><p></p><p></p>
                                </li>
                            }
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
                        {isOwner &&
                            <div className={styles.buttons}>
                                <Link to={`/recipie/${recipieId}/edit`} className={styles.button}>
                                    Edit
                                </Link>
                                <button
                                    onClick={recipieDeleteHandler}
                                    className={styles.button}
                                >
                                    Delete
                                </button>
                            </div>
                        }

                    </div>

                    {user.email &&
                        <div className={styles.commentBox}>
                            <article className={styles.createComment}>
                                <label>Добави коментар</label>
                                <form className={styles.form}
                                    onSubmit={addCommentHandler}
                                >
                                    <textarea
                                        name="comment"
                                        placeholder="коментар......"
                                        value={newComment}
                                        onChange={onChangeComment}
                                    />

                                    <input
                                        className={styles.btnSubmit}
                                        type="submit"
                                        value="Add Comment"
                                    />
                                </form>
                            </article>
                        </div>
                    }
                </div>
            }
        </section>
    );
};

export default RecipieDetails;