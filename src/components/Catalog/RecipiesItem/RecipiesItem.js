import styles from'./RecipiesItem.module.css'
import { Link } from 'react-router-dom';

const RecipiesItem = ({ recipie }) => {
    return (
        <div className={styles.allRecipies}>
            <div className={styles.allRecipiesInfo}>
                <img src={recipie.image}/>
                <h2>{recipie.title}</h2>
                <h6>Категория: {recipie.category}</h6>
                

                <Link to={`/catalog/${recipie._id}`} className={styles.detailsButton}>
                    Детайли
                </Link>
            </div>

        </div>
    );
};

export default RecipiesItem;
