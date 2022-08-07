
import styles from './Home.module.css';
import { Oval } from 'react-loader-spinner';

import { useState, useEffect } from 'react';
import * as recipieService from '../../services/recipieService'

import RecipiesItem from "../Catalog/RecipiesItem/RecipiesItem";

const Home = () => {
    const [latestRecipies, setLatestRecipies] = useState({});
    const [recommended, setRecommended] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        recipieService.getLatest()
            .then(result => {
                const latestThree = result.slice(0, 3);
                setLatestRecipies(latestThree)
            });
        recipieService.getAll()
            .then(result => {
                const recomendedRecipies = getMultipleRandom(result, 3);
                setRecommended(recomendedRecipies);
                setIsLoading(false);
            })

    }, []);

    function getMultipleRandom(arr, num) {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());

        return shuffled.slice(0, num);
    }

    return (
        <div className={styles.home}>
            {isLoading
                ? <div className={styles.loader}>
                    <Oval
                        color="#3fa37f"
                        height="100"
                        width="100"
                    />
                </div>
                : <div><h1>Добре дошли в приложението за рецепти</h1>
                    <section className={styles.welcome}>

                        <div className={styles.imgWrapper}>
                            <img className={styles.homeImg} src="/img/pic2.png" alt="image2" width={"350px"} height={"150px"} />
                            <img className={styles.homeImg2} src="/img/pic5.png" alt="image5" width={"170px"} height={"150px"} />
                            <img className={styles.homeImg2} src="/img/pic3.png" alt="image3" width={"170px"} height={"150px"} />
                            <img className={styles.homeImg} src="/img/pic1.jpg" alt="image1" width={"350px"} height={"150px"} />
                            <img className={styles.homeImg2} src="/img/pic4.png" alt="image4" width={"140px"} height={"150px"} />

                        </div>

                        <div className={styles.latest}>
                            <h1>Най-новите рецепти</h1>
                            <div className={styles.latestItems}>
                                {latestRecipies.length > 0
                                    ? latestRecipies.map(x => <RecipiesItem key={x._id} recipie={x} />)
                                    : <p className="no-articles">Няма нови рецепти</p>
                                }
                            </div>

                        </div>

                        <div className={styles.mostComment}>
                            <h1>Предложени от нас</h1>
                            <div className={styles.mostCommentItems}>
                                {recommended.length > 0
                                    ? recommended.map(x => <RecipiesItem key={x._id} recipie={x} />)
                                    : <p className="no-articles">Няма рецепти</p>
                                }
                            </div>
                        </div>
                    </section>
                </div>
            }
        </div>
    );
}

export default Home;
