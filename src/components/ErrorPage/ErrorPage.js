import styles from './ErrorPage.module.css'

const ErrorPage = () => {
    return (
        <div className={styles.error}>
            <div className={styles.text}>
                Грешка
            </div>
            <div className={styles.num}>404</div>
            <div className={styles.text}>
                Страницата киято търсите не е намерена
            </div>

        </div>

    );
};


export default ErrorPage;