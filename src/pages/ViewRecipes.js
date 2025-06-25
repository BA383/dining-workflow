import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { isAdmin, isDining } from '../utils/permissions'; // adjust path as needed
import { getCurrentUser, setRLSContext } from '../utils/userSession';
import { Link } from 'react-router-dom';


function ViewRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedRecipe, setEditedRecipe] = useState({ name: '', yield: 0 });
  const [user, setUser] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');

  
useEffect(() => {
  async function init() {
    let currentUser = await getCurrentUser();

    // Fallback to localStorage if Supabase session is missing
    if (!currentUser?.unit || !currentUser?.role) {
      console.warn('⚠️ Falling back to localStorage');
      currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    }

    setUser(currentUser);
    setSelectedUnit(currentUser?.unit || '');

    if (currentUser?.unit && currentUser?.role) {
      fetchRecipes(currentUser.unit, currentUser.role);
    } else {
      console.warn('❌ Missing unit or role – fetchRecipes skipped');
    }
  }

  init();
}, []);

if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Inventory is for Dining staff only.</p>
      </div>
    );
  }

 const fetchRecipes = async (unit, role) => {
  await supabase.rpc('set_config', {
    config_key: 'request.unit',
    config_value: unit,
  });

  await supabase.rpc('set_config', {
    config_key: 'request.role',
    config_value: role,
  });

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch recipes:', error.message);
  } else {
    setRecipes(data);
    if (data.length === 0) {
      console.warn('⚠️ No recipes found.');
    }
  }
};



  const startEdit = (index) => {
    setEditingIndex(index);
    setEditedRecipe({
      name: recipes[index].name,
      yield: recipes[index].yield,
    });
  };

  const saveEdit = async (id) => {
    const { error } = await supabase
      .from('recipes')
      .update({ name: editedRecipe.name, yield: editedRecipe.yield })
      .eq('id', id);

    if (error) {
      console.error('Update error:', error.message);
      alert('Failed to update recipe.');
    } else {
      alert('✅ Recipe updated');
      setEditingIndex(null);
      fetchRecipes(user.unit);
    }
  };

  const deleteRecipe = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error.message);
      alert('Failed to delete recipe.');
    } else {
      alert('✅ Recipe deleted');
      fetchRecipes(user.unit);
    }
  };

  const printRecipe = (recipe) => {
    const printable = `Recipe: ${recipe.name}\nYield: ${recipe.yield}\n\nIngredients:\n` +
      recipe.items.map(i => `- ${i.quantity} ${i.unit} of ${i.sku}`).join('\n');
    const win = window.open('', '_blank');
    win.document.write(`<pre>${printable}</pre>`);
    win.print();
    win.close();
  };

  return (
   <div className="p-6 max-w-6xl mx-auto">
  <div className="flex flex-col gap-2 mb-4">
    <BackToInventoryDashboard />

    <Link
      to="/recipe-conversion"
      className="text-purple-600 hover:underline"
    >
      ← Go back to Recipe Conversion
    </Link>
  </div>

  <h2 className="text-2xl font-bold mb-4">
    Recipes – {user?.unit || '...'}
  </h2>

   

      {recipes.length === 0 ? (
        <p className="text-gray-500">No recipes found for this dining unit.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Recipe Name</th>
              <th className="border p-2 text-left">Yield</th>
              <th className="border p-2 text-left">Created By</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((recipe, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">
                  {editingIndex === i ? (
                    <input
                      className="border px-2 py-1 rounded w-full"
                      value={editedRecipe.name}
                      onChange={(e) => setEditedRecipe({ ...editedRecipe, name: e.target.value })}
                    />
                  ) : (
                    recipe.name
                  )}
                </td>
                <td className="p-2">
                  {editingIndex === i ? (
                    <input
                      type="number"
                      className="border px-2 py-1 rounded w-20"
                      value={editedRecipe.yield}
                      onChange={(e) => setEditedRecipe({ ...editedRecipe, yield: Number(e.target.value) })}
                    />
                  ) : (
                    recipe.yield
                  )}
                </td>
                <td className="p-2">{recipe.created_by}</td>
                <td className="p-2 flex gap-2">
                  {editingIndex === i ? (
                    <>
                      <button className="text-green-600 text-xs underline" onClick={() => saveEdit(recipe.id)}>Save</button>
                      <button className="text-gray-600 text-xs underline" onClick={() => setEditingIndex(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="text-blue-600 text-xs underline" onClick={() => startEdit(i)}>Edit</button>
                      <button className="text-red-600 text-xs underline" onClick={() => deleteRecipe(recipe.id)}>Delete</button>
                      <button className="text-green-600 text-xs underline" onClick={() => printRecipe(recipe)}>Print</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ViewRecipes;
