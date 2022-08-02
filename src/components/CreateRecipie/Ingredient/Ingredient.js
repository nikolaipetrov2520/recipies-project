import styles from './Ingredient.module.css'

const Ingredient = (
    {ingredient}
) => {
    return (
        <div className={styles.item}>
            <div>{ingredient.name}</div>
            <div> - </div>
            <div>{ingredient.quantity}</div>
        </div>

    );
};

export default Ingredient