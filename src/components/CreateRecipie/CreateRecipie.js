import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

import styles from './CreateRecipie.module.css';
import Ingredient from './Ingredient/Ingredient';
import * as recipieService from '../../services/recipieService';

const CreateRecipie = () => {
    const navigate = useNavigate();
    const [ingredients, setIngredients] = useState([]);
    const [ingredientName, setIngredientName] = useState('');
    const [ingredientQuantity, setIngredientQuantity] = useState('');

    const onSubmit = (e) => {
        e.preventDefault();

        const recipieData = Object.fromEntries(new FormData(e.target));
        delete recipieData.ingredientName;
        delete recipieData.ingredientquantity;
        recipieData.ingredients = ingredients;

        console.log(recipieData);

        recipieService.create(recipieData)
            .then(result => {
                navigate(`/catalog/${result._id}`)
            });
    };

    const addIngredientHandler = (e) => {
        const newIngredient = { 'name': ingredientName, 'quantity': ingredientQuantity };
        setIngredients(ingredients => [...ingredients, newIngredient])
        setIngredientName('');
        setIngredientQuantity('');
    }

    const onCahngeIngredientsName = (e) => {
        setIngredientName(e.target.value);
    }

    const onCahngeIngredientsQuantity = (e) => {
        setIngredientQuantity(e.target.value);
    }

    const onClickRemoveIngredientHandler = (ingredientsName) => {
        setIngredients(ingredients.filter(x => x.name !== ingredientsName))
    }

    return (

        <div className={styles.home}>
            <section id="create-page" className={styles.createPage}>
                <form id="create" onSubmit={onSubmit}>
                    <div className={styles.container}>
                        <h1>Създай рецепта</h1>
                        <div>
                            <label htmlFor="leg-title">Име на рецептата</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                placeholder="Въведете име..."
                            />
                        </div>
                        <div>
                            <label htmlFor="category">Категория</label>
                            <input
                                type="text"
                                id="category"
                                name="category"
                                placeholder="въведете категория..."
                            />
                        </div>

                        <div>
                            <label htmlFor="preparationTime">Време за подготовка</label>
                            <input
                                type="text"
                                id="preparationTime"
                                name="preparationTime"
                                placeholder="Въведете минути..."
                            />
                        </div>

                        <div>
                            <label htmlFor="neededTime">Време за приготвяне</label>
                            <input
                                type="text"
                                id="neededTime"
                                name="neededTime"
                                placeholder="Въведете минути..."
                            />
                        </div>

                        <div>
                            <label htmlFor="portions">брой порции</label>
                            <input
                                type="number"
                                id="portions"
                                name="portions"
                                min={1}
                                placeholder={1}
                            />
                        </div>

                        <div>
                            <label htmlFor="image">Снимка</label>
                            <input
                                type="text"
                                id="image"
                                name="image"
                                placeholder="Качете снимка..."
                            />
                        </div>
                        <div id={styles.ingredientsWrapper}>
                            <div id={styles.newIngredients}>
                                <label htmlFor="ingredient">Добави съставка</label>
                                <div className={styles.ingredient}>
                                    <input
                                        type="text"
                                        id="ingredient"
                                        name="ingredientName"
                                        placeholder="Име..."
                                        value={ingredientName}
                                        onChange={onCahngeIngredientsName}
                                    />
                                    <input
                                        type="text"
                                        id="ingredient"
                                        name="ingredientquantity"
                                        placeholder="Количество..."
                                        value={ingredientQuantity}
                                        onChange={onCahngeIngredientsQuantity}
                                    />
                                    <button type='button' onClick={addIngredientHandler} >Добави</button>
                                </div>
                            </div>
                            <div id={styles.ingredients}>
                                <div>Съставки</div>
                                <div className={styles.ingredientsItemList}>
                                    {ingredients.length > 0
                                        ? ingredients.map(x =>
                                            <Ingredient
                                            key={x.name}
                                            ingredient={x}
                                            onClick={onClickRemoveIngredientHandler}
                                            />)
                                        : <h6 className={styles.noArticles}>Няма добавени съставки</h6>
                                    }
                                </div>

                            </div>
                        </div>

                        <div id={styles.preparation}>
                            <label htmlFor="preparation">Начин на приготвяне</label>
                            <textarea name="preparation" id="summary" defaultValue={""} placeholder="Въведете начин на приготвяне..." />
                        </div>


                        <input
                            className={styles.btnSubmit}
                            type="submit"
                            value="Създай рецептата"
                        />
                    </div>
                </form>
            </section>
        </div>

    );
};

export default CreateRecipie;