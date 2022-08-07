import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import styles from './EditRecipie.module.css';
import EditIngredient from './EditIngredient/EditIngredient';
import * as recipieService from '../../services/recipieService';
import { useAuthContext } from '../../contexts/AuthContext';

const EditRecipie = () => {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const { recipieId } = useParams();
    const [recipie, setRecipie] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [ingredientName, setIngredientName] = useState('');
    const [ingredientQuantity, setIngredientQuantity] = useState('');
    const [validateMessageStyle, setValidateMessageStyle] = useState("none");

    useEffect(() => {
        (async () => {
            const recipieDetails = await recipieService.getOne(recipieId);
            if (recipieDetails._ownerId !== user._id) {
                navigate('/catalog');
            }
            setRecipie(recipieDetails);
            setIngredients(recipieDetails.ingredients);
        })();
    }, [recipieId, navigate, user._id]);

    const onSubmit = (e) => {
        e.preventDefault();

        const recipieData = Object.fromEntries(new FormData(e.target));
        delete recipieData.ingredientName;
        delete recipieData.ingredientquantity;
        recipieData.ingredients = ingredients;

        if (recipieData.category !== ""
            && recipieData.image !== ""
            && recipieData.neededTime !== ""
            && recipieData.portions !== ""
            && recipieData.preparation !== ""
            && recipieData.preparationTime !== ""
            && recipieData.title !== ""
            && recipieData.ingredients.length > 0) {
            console.log(recipieData);
            setValidateMessageStyle("block");
            recipieService.edit(recipieId, recipieData)
                .then(result => {
                    console.log(result)
                    navigate(`/catalog/${result._id}`)
                });
        } else {
            setValidateMessageStyle("block");
        }

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
            <section id="create-page" className={styles.editPage}>
                <h1>Редакрирай рецепта</h1>
                <p style={{ display: validateMessageStyle }} >Всички полета трябва да бъдат попълнени!!!</p>
                <form id="create" onSubmit={onSubmit}>
                    <div className={styles.container}>
                        <div>
                            <label htmlFor="leg-title">Име на рецептата</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                placeholder="Въведете име..."
                                defaultValue={recipie.title}
                            />
                        </div>
                        <div>
                            <label htmlFor="category">Категория</label>
                            <input
                                type="text"
                                id="category"
                                name="category"
                                placeholder="въведете категория..."
                                defaultValue={recipie.category}
                            />
                        </div>

                        <div>
                            <label htmlFor="preparationTime">Време за подготовка</label>
                            <input
                                type="text"
                                id="preparationTime"
                                name="preparationTime"
                                placeholder="Въведете минути..."
                                defaultValue={recipie.preparationTime}
                            />
                        </div>

                        <div>
                            <label htmlFor="neededTime">Време за приготвяне</label>
                            <input
                                type="text"
                                id="neededTime"
                                name="neededTime"
                                placeholder="Въведете минути..."
                                defaultValue={recipie.neededTime}
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
                                defaultValue={recipie.portions}
                            />
                        </div>

                        <div>
                            <label htmlFor="image">Снимка</label>
                            <input
                                type="text"
                                id="image"
                                name="image"
                                placeholder="Качете снимка..."
                                defaultValue={recipie.image}
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
                                            <EditIngredient
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
                            <textarea name="preparation"
                                id="summary"
                                placeholder="Въведете начин на приготвяне..."
                                defaultValue={recipie.preparation} />
                        </div>


                        <input
                            className={styles.btnSubmit}
                            type="submit"
                            value="Готово"
                        />
                    </div>
                </form>
            </section>
        </div>

    );
};

export default EditRecipie;