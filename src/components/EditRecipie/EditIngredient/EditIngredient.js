import styles from './EditIngredient.module.css'

const EditIngredient = ({
    ingredient,
    onClick
 }
) => {
    return (
        <div className={styles.item}>
            <button type='button' id={styles.deleteBtn} onClick={() => onClick(ingredient.name)}>x</button>
            <div>{ingredient.name}</div>
            <div> - </div>
            <div>{ingredient.quantity}</div>
            
        </div>

    );
};

export default EditIngredient