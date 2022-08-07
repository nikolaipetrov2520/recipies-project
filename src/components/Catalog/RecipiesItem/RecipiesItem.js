import styles from './RecipiesItem.module.css'
import { Link } from 'react-router-dom';

const RecipiesItem = ({ recipie }) => {
    return (
        <div className={styles.allRecipies}>
            <div className={styles.allRecipiesInfo}>
                <h2>{recipie.title}</h2>
                <div className={styles.img}>
                    <img src={recipie.image} alt="Снимка" />

                    <div className={styles.info}>
                        <h6>Категория: {recipie.category}</h6>
                        <Link to={`/catalog/${recipie._id}`} className={styles.detailsButton}>
                            виж рецептата
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipiesItem;
