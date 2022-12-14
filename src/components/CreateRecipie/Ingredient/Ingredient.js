import styles from './Ingredient.module.css'

const Ingredient = ({
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

export default Ingredient