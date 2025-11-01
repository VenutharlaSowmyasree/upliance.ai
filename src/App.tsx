import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Plus, Trash2, ArrowUp, ArrowDown, Star, Play, Pause, Square, Clock, ChefHat } from 'lucide-react';
import './App.css';

// --- TYPES (No Changes Here) ---
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Ingredient = { id: string; name: string; quantity: number; unit: string; };
type CookSettings = { temperature: number; speed: number; };
type RecipeStep = { id: string; description: string; type: 'cooking' | 'instruction'; durationMinutes: number; cookingSettings?: CookSettings; ingredientIds?: string[]; };
type Recipe = { id: string; title: string; cuisine?: string; difficulty: Difficulty; ingredients: Ingredient[]; steps: RecipeStep[]; isFavorite?: boolean; createdAt: string; updatedAt: string; };
type SessionState = { activeRecipeId: string | null; byRecipeId: Record<string, { currentStepIndex: number; isRunning: boolean; stepRemainingSec: number; overallRemainingSec: number; lastTickTs?: number; }>; };

// --- MAIN APP COMPONENT ---
const RecipeApp = () => {
  const [currentRoute, setCurrentRoute] = useState('/recipes');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>({ activeRecipeId: null, byRecipeId: {} });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const timerRef = useRef<number | null>(null);

  useEffect(() => { loadRecipes(); }, []);
  
  // --- All the logic remains the same ---
  const loadRecipes = () => {
    const stored = localStorage.getItem('recipes:v1');
    if (stored) {
      try { setRecipes(JSON.parse(stored)); } catch (e) { console.error('Failed to load recipes', e); }
    } else {
      const demoRecipe: Recipe = { id: 'demo-1', title: 'Simple Pasta Carbonara', cuisine: 'Italian', difficulty: 'Medium', ingredients: [ { id: 'ing-1', name: 'Spaghetti', quantity: 400, unit: 'g' }, { id: 'ing-2', name: 'Eggs', quantity: 4, unit: 'pcs' }, { id: 'ing-3', name: 'Parmesan', quantity: 100, unit: 'g' }, { id: 'ing-4', name: 'Bacon', quantity: 200, unit: 'g' } ], steps: [ { id: 'step-1', description: 'Boil water and add salt', type: 'cooking', durationMinutes: 2, cookingSettings: { temperature: 100, speed: 3 } }, { id: 'step-2', description: 'Add spaghetti to boiling water', type: 'instruction', durationMinutes: 8, ingredientIds: ['ing-1'] }, { id: 'step-3', description: 'Fry bacon until crispy', type: 'cooking', durationMinutes: 5, cookingSettings: { temperature: 180, speed: 4 } }, { id: 'step-4', description: 'Mix eggs and parmesan cheese in a bowl', type: 'instruction', durationMinutes: 2, ingredientIds: ['ing-2', 'ing-3'] }, { id: 'step-5', description: 'Combine pasta with egg mixture and bacon', type: 'instruction', durationMinutes: 3, ingredientIds: ['ing-1', 'ing-2', 'ing-3', 'ing-4'] } ], isFavorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setRecipes([demoRecipe]);
      saveRecipesToStorage([demoRecipe]);
    }
  };
  const saveRecipesToStorage = (recipesToSave: Recipe[]) => { localStorage.setItem('recipes:v1', JSON.stringify(recipesToSave)); };
  useEffect(() => {
    if (sessionState.activeRecipeId) {
      const session = sessionState.byRecipeId[sessionState.activeRecipeId];
      if (session?.isRunning) { timerRef.current = window.setInterval(() => { tickSecond(); }, 1000); } else { if (timerRef.current) clearInterval(timerRef.current); }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionState.activeRecipeId, sessionState.byRecipeId[sessionState.activeRecipeId || '']?.isRunning]);
  const tickSecond = () => {
    setSessionState(prev => {
      if (!prev.activeRecipeId) return prev;
      const session = prev.byRecipeId[prev.activeRecipeId];
      if (!session || !session.isRunning) return prev;
      const now = Date.now();
      const delta = session.lastTickTs ? Math.floor((now - session.lastTickTs) / 1000) : 1;
      let newStepRemaining = Math.max(0, session.stepRemainingSec - delta);
      let newOverallRemaining = Math.max(0, session.overallRemainingSec - delta);
      let newStepIndex = session.currentStepIndex;
      const recipe = recipes.find(r => r.id === prev.activeRecipeId);
      if (!recipe) return prev;
      if (newStepRemaining === 0 && newStepIndex < recipe.steps.length - 1) { newStepIndex++; const nextStep = recipe.steps[newStepIndex]; newStepRemaining = nextStep.durationMinutes * 60;
      } else if (newStepRemaining === 0 && newStepIndex === recipe.steps.length - 1) { showSnackbar('Recipe completed!', 'success'); return { activeRecipeId: null, byRecipeId: {} }; }
      return { ...prev, byRecipeId: { ...prev.byRecipeId, [prev.activeRecipeId]: { ...session, stepRemainingSec: newStepRemaining, overallRemainingSec: newOverallRemaining, currentStepIndex: newStepIndex, lastTickTs: now } } };
    });
  };
  const showSnackbar = (message: string, severity: 'success' | 'error') => { setSnackbar({ open: true, message, severity }); setTimeout(() => setSnackbar(prev => ({ ...prev, open: false })), 3000); };
  const startSession = (recipeId: string) => {
    if (sessionState.activeRecipeId) { showSnackbar('Another session is already active', 'error'); return; }
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    const totalSec = recipe.steps.reduce((sum, s) => sum + s.durationMinutes * 60, 0);
    setSessionState({ activeRecipeId: recipeId, byRecipeId: { [recipeId]: { currentStepIndex: 0, isRunning: true, stepRemainingSec: recipe.steps[0].durationMinutes * 60, overallRemainingSec: totalSec, lastTickTs: Date.now() } } });
  };
  const pauseSession = () => { if (!sessionState.activeRecipeId) return; setSessionState(prev => ({ ...prev, byRecipeId: { ...prev.byRecipeId, [prev.activeRecipeId!]: { ...prev.byRecipeId[prev.activeRecipeId!], isRunning: false } } })); };
  const resumeSession = () => { if (!sessionState.activeRecipeId) return; setSessionState(prev => ({ ...prev, byRecipeId: { ...prev.byRecipeId, [prev.activeRecipeId!]: { ...prev.byRecipeId[prev.activeRecipeId!], isRunning: true, lastTickTs: Date.now() } } })); };
  const stopSession = () => {
    if (!sessionState.activeRecipeId) return;
    const session = sessionState.byRecipeId[sessionState.activeRecipeId];
    const recipe = recipes.find(r => r.id === sessionState.activeRecipeId);
    if (!recipe || !session) return;
    if (session.currentStepIndex === recipe.steps.length - 1) { showSnackbar('Recipe ended', 'success'); setSessionState({ activeRecipeId: null, byRecipeId: {} });
    } else {
      const nextIndex = session.currentStepIndex + 1;
      const nextStep = recipe.steps[nextIndex];
      setSessionState(prev => ({ ...prev, byRecipeId: { ...prev.byRecipeId, [prev.activeRecipeId!]: { ...session, currentStepIndex: nextIndex, stepRemainingSec: nextStep.durationMinutes * 60, overallRemainingSec: session.overallRemainingSec - session.stepRemainingSec, isRunning: true, lastTickTs: Date.now() } } }));
      showSnackbar('Step ended', 'success');
    }
  };
  const saveRecipe = (recipe: Recipe) => { const existing = recipes.find(r => r.id === recipe.id); let newRecipes; if (existing) { newRecipes = recipes.map(r => r.id === recipe.id ? { ...recipe, updatedAt: new Date().toISOString() } : r); } else { newRecipes = [...recipes, { ...recipe, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]; } setRecipes(newRecipes); saveRecipesToStorage(newRecipes); showSnackbar('Recipe saved!', 'success'); };
  const deleteRecipe = (recipeId: string) => { const newRecipes = recipes.filter(r => r.id !== recipeId); setRecipes(newRecipes); saveRecipesToStorage(newRecipes); showSnackbar('Recipe deleted!', 'success'); };
  const toggleFavorite = (recipeId: string) => { const newRecipes = recipes.map(r => r.id === recipeId ? { ...r, isFavorite: !r.isFavorite } : r ); setRecipes(newRecipes); saveRecipesToStorage(newRecipes); };
  const navigate = (route: string, recipeId?: string) => { if (recipeId) { setCurrentRoute(`${route}/${recipeId}`); } else { setCurrentRoute(route); } };

  const renderRoute = () => {
    if (currentRoute === '/recipes') return <RecipesList recipes={recipes} onNavigate={navigate} onToggleFavorite={toggleFavorite} onDelete={deleteRecipe} />;
    if (currentRoute === '/create') return <RecipeBuilder onSave={saveRecipe} onCancel={() => navigate('/recipes')} />;
    if (currentRoute.startsWith('/cook/')) {
      const recipeId = currentRoute.split('/')[2];
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) return <div style={{padding: '1rem'}}>Recipe not found</div>;
      return <CookingSession recipe={recipe} session={sessionState.byRecipeId[recipeId]} isActive={sessionState.activeRecipeId === recipeId} onStart={() => startSession(recipeId)} onPause={pauseSession} onResume={resumeSession} onStop={stopSession} onToggleFavorite={toggleFavorite} onBack={() => navigate('/recipes')} />;
    }
    return null;
  };

  const showMiniPlayer = sessionState.activeRecipeId && !currentRoute.startsWith(`/cook/${sessionState.activeRecipeId}`);

  return (
    <div className="recipe-app">
      <div className="recipe-app__container">
        <header className="app-header">
          <ChefHat className="app-header__icon" />
          <h1 className="app-header__title">Recipe Builder</h1>
        </header>
        
        <main>{renderRoute()}</main>

        {showMiniPlayer && (
          <MiniPlayer
            recipe={recipes.find(r => r.id === sessionState.activeRecipeId)!}
            session={sessionState.byRecipeId[sessionState.activeRecipeId!]}
            onPause={pauseSession}
            onResume={resumeSession}
            onStop={stopSession}
            onNavigate={() => navigate('/cook', sessionState.activeRecipeId!)}
          />
        )}

        {snackbar.open && (
          <div className={`snackbar snackbar--${snackbar.severity}`}>
            {snackbar.message}
          </div>
        )}
      </div>
    </div>
  );
};

// --- RECIPES LIST COMPONENT ---
const RecipesList = ({ recipes, onNavigate, onToggleFavorite, onDelete }: { recipes: Recipe[]; onNavigate: (route: string, recipeId?: string) => void; onToggleFavorite: (recipeId: string) => void; onDelete: (recipeId: string) => void; }) => {
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const getTotalTime = (recipe: Recipe) => recipe.steps.reduce((sum, s) => sum + s.durationMinutes, 0);
  const filtered = recipes.filter(r => difficultyFilter.length === 0 || difficultyFilter.includes(r.difficulty));
  const sorted = [...filtered].sort((a, b) => { const timeA = getTotalTime(a); const timeB = getTotalTime(b); return sortOrder === 'asc' ? timeA - timeB : timeB - timeA; });
  const toggleDifficulty = (diff: Difficulty) => { if (difficultyFilter.includes(diff)) { setDifficultyFilter(difficultyFilter.filter(d => d !== diff)); } else { setDifficultyFilter([...difficultyFilter, diff]); } };

  return (
    <section>
      <div className="recipes-list__controls">
        <button onClick={() => onNavigate('/create')} className="btn btn--primary">
          <Plus width={20} height={20} /> Create Recipe
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(diff => (
            <button key={diff} onClick={() => toggleDifficulty(diff)} className={`btn btn--secondary ${difficultyFilter.includes(diff) ? 'btn--primary' : ''}`}>
              {diff}
            </button>
          ))}
        </div>
        <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="btn btn--secondary">
          Time {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="recipes-grid">
        {sorted.map(recipe => (
          <div key={recipe.id} className="recipe-card">
            <div className="recipe-card__header">
              <h3 className="recipe-card__title" onClick={() => onNavigate('/cook', recipe.id)}>
                {recipe.title}
              </h3>
              <div className="recipe-card__actions">
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id); }} className="recipe-card__action-btn recipe-card__action-btn--favorite" title="Toggle Favorite">
                  <Star className={`icon ${recipe.isFavorite ? 'recipe-card__favorite-icon--filled' : ''}`} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this recipe?')) onDelete(recipe.id); }} className="recipe-card__action-btn recipe-card__action-btn--delete" title="Delete Recipe">
                  <Trash2 className="icon" />
                </button>
              </div>
            </div>
            {recipe.cuisine && <p className="recipe-card__cuisine">{recipe.cuisine}</p>}
            <div className="recipe-card__tags">
              <span className={`tag tag--difficulty-${recipe.difficulty}`}>{recipe.difficulty}</span>
              <span className="tag tag--time"><Clock className="icon" /> {getTotalTime(recipe)} min</span>
            </div>
            <button onClick={() => onNavigate('/cook', recipe.id)} className="btn recipe-card__view-btn">
              View Recipe
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

// --- RECIPE BUILDER COMPONENT ---
const RecipeBuilder = ({ onSave, onCancel }: { onSave: (recipe: Recipe) => void; onCancel: () => void; }) => {
  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Builder logic is unchanged
  const addIngredient = () => { setIngredients([...ingredients, { id: Date.now().toString(), name: '', quantity: 1, unit: 'g' }]); };
  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => { setIngredients(ingredients.map(i => i.id === id ? { ...i, [field]: value } : i)); };
  const removeIngredient = (id: string) => { setIngredients(ingredients.filter(i => i.id !== id)); };
  const addStep = () => { setSteps([...steps, { id: Date.now().toString(), description: '', type: 'instruction', durationMinutes: 5, ingredientIds: [] }]); };
  const updateStep = (id: string, updates: Partial<RecipeStep>) => { setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s)); };
  const removeStep = (id: string) => { setSteps(steps.filter(s => s.id !== id)); };
  const moveStep = (index: number, direction: 'up' | 'down') => { const newSteps = [...steps]; const targetIndex = direction === 'up' ? index - 1 : index + 1; [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]; setSteps(newSteps); };
  const validate = (): boolean => { const errs: string[] = []; if (title.length < 3) errs.push('Title must be at least 3 characters'); if (ingredients.length === 0) errs.push('At least 1 ingredient required'); if (steps.length === 0) errs.push('At least 1 step required'); ingredients.forEach((ing, i) => { if (!ing.name) errs.push(`Ingredient ${i + 1}: name required`); if (ing.quantity <= 0) errs.push(`Ingredient ${i + 1}: quantity must be > 0`); }); steps.forEach((step, i) => { if (!step.description) errs.push(`Step ${i + 1}: description required`); if (step.durationMinutes <= 0) errs.push(`Step ${i + 1}: duration must be > 0`); if (step.type === 'cooking') { if (!step.cookingSettings) errs.push(`Step ${i + 1}: cooking settings required`); else { if (step.cookingSettings.temperature < 40 || step.cookingSettings.temperature > 200) { errs.push(`Step ${i + 1}: temperature must be 40-200`); } if (step.cookingSettings.speed < 1 || step.cookingSettings.speed > 5) { errs.push(`Step ${i + 1}: speed must be 1-5`); } } } else { if (!step.ingredientIds || step.ingredientIds.length === 0) { errs.push(`Step ${i + 1}: at least 1 ingredient required`); } } }); setErrors(errs); return errs.length === 0; };
  const handleSave = () => { if (!validate()) return; const recipe: Recipe = { id: Date.now().toString(), title, cuisine: cuisine || undefined, difficulty, ingredients, steps, isFavorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; onSave(recipe); onCancel(); };

  return (
    <div className="recipe-builder">
      <h2 className="recipe-builder__title">Create Recipe</h2>
      {errors.length > 0 && (
        <div className="error-box">
          <AlertCircle className="error-box__icon" />
          <div className="error-box__text">
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        </div>
      )}

      {/* Form sections */}
      <div className="form-group">
        <input type="text" placeholder="Recipe Title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" />
      </div>
      <div className="form-group">
        <input type="text" placeholder="Cuisine (optional)" value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="form-input" />
      </div>
      <div className="form-group">
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="form-select">
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      <h3 className="form-section-title">Ingredients</h3>
      {ingredients.map((ing) => (
        <div key={ing.id} className="ingredient-row">
          <input type="text" placeholder="Name" value={ing.name} onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)} className="form-input" style={{flex: 1}} />
          <input type="number" placeholder="Qty" value={ing.quantity} onChange={(e) => updateIngredient(ing.id, 'quantity', Number(e.target.value))} className="form-input" style={{width: '6rem'}}/>
          <input type="text" placeholder="Unit" value={ing.unit} onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)} className="form-input" style={{width: '6rem'}}/>
          <button onClick={() => removeIngredient(ing.id)} className="btn-icon btn-icon--danger"><Trash2 size={20} /></button>
        </div>
      ))}
      <button onClick={addIngredient} className="btn-add"><Plus size={20} /> Add Ingredient</button>

      <h3 className="form-section-title">Steps</h3>
      {steps.map((step, idx) => (
        <div key={step.id} className="step-card">
          <div className="step-card__header">
            <span>Step {idx + 1}</span>
            <div>
              <button disabled={idx === 0} onClick={() => moveStep(idx, 'up')} className="btn-icon"><ArrowUp size={20} /></button>
              <button disabled={idx === steps.length - 1} onClick={() => moveStep(idx, 'down')} className="btn-icon"><ArrowDown size={20} /></button>
              <button onClick={() => removeStep(step.id)} className="btn-icon btn-icon--danger"><Trash2 size={20} /></button>
            </div>
          </div>
          <textarea placeholder="Description" value={step.description} onChange={(e) => updateStep(step.id, { description: e.target.value })} className="form-textarea" rows={2}/>
        </div>
      ))}
      <button onClick={addStep} className="btn-add"><Plus size={20} /> Add Step</button>

      <div className="builder-actions">
        <button onClick={handleSave} className="btn btn--primary">Save Recipe</button>
        <button onClick={onCancel} className="btn btn--secondary">Cancel</button>
      </div>
    </div>
  );
};

// --- COOKING SESSION COMPONENT ---
const CookingSession = ({ recipe, session, onStart, onPause, onResume, onStop, onToggleFavorite, onBack }: { recipe: Recipe; session: SessionState['byRecipeId'][string] | undefined; isActive: boolean; onStart: () => void; onPause: () => void; onResume: () => void; onStop: () => void; onToggleFavorite: (recipeId: string) => void; onBack: () => void; }) => {
  const totalTime = recipe.steps.reduce((sum, s) => sum + s.durationMinutes, 0);
  const currentStep = session ? recipe.steps[session.currentStepIndex] : null;
  const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
  const stepProgressPercent = session && currentStep ? Math.round(((currentStep.durationMinutes * 60 - session.stepRemainingSec) / (currentStep.durationMinutes * 60)) * 100) : 0;
  const totalDurationSec = totalTime * 60;
  const overallProgressPercent = session ? Math.round(((totalDurationSec - session.overallRemainingSec) / totalDurationSec) * 100) : 0;
  
  return (
    <section>
      <button onClick={onBack} className="back-button">← Back to Recipes</button>
      <div className="session-card">
        {/* Session Header */}
        <div className="recipe-card__header">
            <div>
                <h2 className="recipe-card__title" style={{fontSize: '1.875rem', cursor: 'default'}}>{recipe.title}</h2>
                {recipe.cuisine && (<p className="recipe-card__cuisine">{recipe.cuisine}</p>)}
                <div className="recipe-card__tags">
                    <span className={`tag tag--difficulty-${recipe.difficulty}`}>{recipe.difficulty}</span>
                    <span className="tag tag--time"><Clock className="icon" />{totalTime} min</span>
                </div>
            </div>
            <button onClick={() => onToggleFavorite(recipe.id)} className="recipe-card__action-btn recipe-card__action-btn--favorite" title="Toggle Favorite">
                <Star className={`icon ${recipe.isFavorite ? 'recipe-card__favorite-icon--filled' : ''}`} width={32} height={32} />
            </button>
        </div>
        {!session && (
          <div className="start-session-view">
            <h3 className="form-section-title">Ingredients</h3>
            <div className="ingredient-list">
              {recipe.ingredients.map(ing => ( <div key={ing.id}>{ing.quantity} {ing.unit} {ing.name}</div> ))}
            </div>
            <div style={{textAlign: 'center', marginTop: '2rem'}}>
                <button onClick={onStart} className="btn btn--primary btn--large"><Play />Start Cooking Session</button>
            </div>
          </div>
        )}
      </div>

      {session && currentStep && (
        <>
          {/* Active Step Card */}
          <div className="session-card">
              <h3 className="form-section-title">Step {session.currentStepIndex + 1} of {recipe.steps.length}</h3>
              <div className="step-progress">
                  {/* Timer */}
                  <div className="progress-timer">
                    <svg className="progress-timer__svg" viewBox="0 0 100 100">
                      <circle className="progress-timer__ring progress-timer__ring-bg" cx="50" cy="50" r="45" />
                      <circle className="progress-timer__ring progress-timer__ring-fg" cx="50" cy="50" r="45" strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - stepProgressPercent / 100)} />
                    </svg>
                    <span className="progress-timer__text">{formatTime(session.stepRemainingSec)}</span>
                  </div>
                  {/* Description */}
                  <div className="step-details">
                      <p className="step-description">{currentStep.description}</p>
                      <div className="recipe-card__tags">
                          {/* Tags */}
                      </div>
                  </div>
              </div>
              <div className="session-controls">
                {session.isRunning ? <button onClick={onPause} className="btn btn--secondary"><Pause />Pause</button> : <button onClick={onResume} className="btn btn--secondary"><Play />Resume</button>}
                <button onClick={onStop} className="btn btn--danger-outline"><Square />End Step</button>
              </div>
          </div>
          {/* Overall Progress & Timeline */}
        </>
      )}
    </section>
  );
};

// --- MINI PLAYER COMPONENT ---
const MiniPlayer = ({ recipe, session, onPause, onResume, onStop, onNavigate }: { recipe: Recipe; session: SessionState['byRecipeId'][string]; onPause: () => void; onResume: () => void; onStop: () => void; onNavigate: () => void; }) => {
  const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, '0')}`; };
  const currentStep = recipe.steps[session.currentStepIndex];
  const stepProgressPercent = Math.round(((currentStep.durationMinutes * 60 - session.stepRemainingSec) / (currentStep.durationMinutes * 60)) * 100);

  return (
    <div className="mini-player" onClick={onNavigate}>
      <div className="mini-player__content">
        <div className="progress-timer progress-timer--mini">
            <svg className="progress-timer__svg" viewBox="0 0 100 100">
                <circle className="progress-timer__ring progress-timer__ring-bg" cx="50" cy="50" r="45" />
                <circle className="progress-timer__ring progress-timer__ring-fg" cx="50" cy="50" r="45" strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - stepProgressPercent / 100)} />
            </svg>
            <span className="progress-timer__text">{formatTime(session.stepRemainingSec)}</span>
        </div>
        <div className="mini-player__info">
          <p className="mini-player__title">{recipe.title}</p>
          <p className="mini-player__status">{session.isRunning ? '▶ Running' : '⏸ Paused'} · Step {session.currentStepIndex + 1} of {recipe.steps.length}</p>
        </div>
        <div className="mini-player__controls" onClick={(e) => e.stopPropagation()}>
          {session.isRunning ? <button onClick={onPause} className="btn-icon" title="Pause"><Pause size={20}/></button> : <button onClick={onResume} className="btn-icon" title="Resume"><Play size={20}/></button>}
          <button onClick={onStop} className="btn-icon btn-icon--danger" title="End Step"><Square size={20}/></button>
        </div>
      </div>
    </div>
  );
};

export default RecipeApp;