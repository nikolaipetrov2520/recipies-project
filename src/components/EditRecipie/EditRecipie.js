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
                <h1>???????????????????? ??????????????</h1>
                <p style={{ display: validateMessageStyle }} >???????????? ???????????? ???????????? ???? ?????????? ??????????????????!!!</p>
                <form id="create" onSubmit={onSubmit}>
                    <div className={styles.container}>
                        <div>
                            <label htmlFor="leg-title">?????? ???? ??????????????????</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                placeholder="???????????????? ??????..."
                                defaultValue={recipie.title}
                            />
                        </div>
                        <div>
                            <label htmlFor="category">??????????????????</label>
                            <input
                                type="text"
                                id="category"
                                name="category"
                                placeholder="???????????????? ??????????????????..."
                                defaultValue={recipie.category}
                            />
                        </div>

                        <div>
                            <label htmlFor="preparationTime">?????????? ???? ????????????????????</label>
                            <input
                                type="text"
                                id="preparationTime"
                                name="preparationTime"
                                placeholder="???????????????? ????????????..."
                                defaultValue={recipie.preparationTime}
                            />
                        </div>

                        <div>
                            <label htmlFor="neededTime">?????????? ???? ????????????????????</label>
                            <input
                                type="text"
                                id="neededTime"
                                name="neededTime"
                                placeholder="???????????????? ????????????..."
                                defaultValue={recipie.neededTime}
                            />
                        </div>

                        <div>
                            <label htmlFor="portions">???????? ????????????</label>
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
                            <label htmlFor="image">????????????</label>
                            <input
                                type="text"
                                id="image"
                                name="image"
                                placeholder="???????????? ????????????..."
                                defaultValue={recipie.image}
                            />
                        </div>
                        <div id={styles.ingredientsWrapper}>
                            <div id={styles.newIngredients}>
                                <label htmlFor="ingredient">???????????? ????????????????</label>
                                <div className={styles.ingredient}>
                                    <input
                                        type="text"
                                        id="ingredient"
                                        name="ingredientName"
                                        placeholder="??????..."
                                        value={ingredientName}
                                        onChange={onCahngeIngredientsName}
                                    />
                                    <input
                                        type="text"
                                        id="ingredient"
                                        name="ingredientquantity"
                                        placeholder="????????????????????..."
                                        value={ingredientQuantity}
                                        onChange={onCahngeIngredientsQuantity}
                                    />
                                    <button type='button' onClick={addIngredientHandler} >????????????</button>
                                </div>
                            </div>
                            <div id={styles.ingredients}>
                                <div>????????????????</div>
                                <div className={styles.ingredientsItemList}>
                                    {ingredients.length > 0
                                        ? ingredients.map(x =>
                                            <EditIngredient
                                                key={x.name}
                                                ingredient={x}
                                                onClick={onClickRemoveIngredientHandler}
                                            />)
                                        : <h6 className={styles.noArticles}>???????? ???????????????? ????????????????</h6>
                                    }
                                </div>

                            </div>
                        </div>

                        <div id={styles.preparation}>
                            <label htmlFor="preparation">?????????? ???? ????????????????????</label>
                            <textarea name="preparation"
                                id="summary"
                                placeholder="???????????????? ?????????? ???? ????????????????????..."
                                defaultValue={recipie.preparation} />
                        </div>


                        <input
                            className={styles.btnSubmit}
                            type="submit"
                            value="????????????"
                        />
                    </div>
                </form>
            </section>
        </div>

    );
};

export default EditRecipie;