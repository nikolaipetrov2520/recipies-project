
import styles from './Home.module.css'

//import LatestGame from "./LatestGame/LatestGame";

const Home = () => {

    return (
        <section className={styles.welcome}>
            <h3>Само в приложението за рецепти</h3>
            <div className={styles.imgWrapper}>
                <img className={styles.homeImg} src="/img/pic1.jpg" alt="image1" width={"300px"} height={"150px"} />
                <img className={styles.homeImg} src="/img/pic2.png" alt="image2" width={"300px"} height={"150px"} />
            </div>

            <div id="home-page">
                <h1>Последни рецепти</h1>

                {/* {games.length > 0
                    ? games.map(x => <LatestGame key={x._id} game={x} />)
                    : <p className="no-articles">No games yet</p>
                } */}
            </div>
        </section>
    );
}

export default Home;
