import styles from './DeleteConfirmation.module.css';

const DeleteConfirmation = ({
    cancel,
    confirmDelete
}) => {

    const cancelClickHandler = () => {
        cancel(false);
    }

    const confirmClickHandler = () => {
        confirmDelete();
        cancel(false);
    }

    return(
        <div className={styles.deleteSection}>
                <div>
                    Сигурни ли сте че искате да изтриете тази рецепта?
                </div>

                <button className={styles.confirm} onClick={confirmClickHandler}>Изтриване</button>
                <button className={styles.cancel} onClick={cancelClickHandler}>Отказ</button>
        </div>
    )
}

export default DeleteConfirmation;