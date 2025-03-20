const category = document.querySelector('#Category');
const form = document.querySelector('#expense-form');
const date = document.querySelector('#date-div');
const filter =  document.querySelector('#filter-form');
const dateFilter = document.querySelector('#date-filter')
const submitButton = document.querySelector('#add-submit-btn');
const expenseItemDelete = document.querySelectorAll('#expense-item-delete');
const safeModeToggle = document.querySelector('#safe-mode-switch');
const detailsToggle = document.querySelector('#details-switch');
const detailElement = document.querySelectorAll('.detail-item');
const totalPrice = document.querySelectorAll('.total-price');
//////////////////////////////////////////
fetch('json/products.json')
    .then(response => response.json())
    .then(data =>{
        category.addEventListener('input', function(event){
            const hasProduct = form.contains(document.querySelector('.input-product'));
            const hasQuantity = form.contains(document.querySelector('.input-quantity'));
            if((event.target.value=='Import' || event.target.value=='Ads' || event.target.value=='RTO' )){
                // DIV for product
                if(hasProduct) return;
                const newDivProduct = document.createElement('div');
                newDivProduct.classList.add('input-item');
                newDivProduct.classList.add('input-product');
                const select = document.createElement('select');
                select.name = 'ProductId';
                let option = document.createElement('option') ;
                if(event.target.value=='Import' || event.target.value=='RTO')
                    option.value = '';
                if(event.target.value=='Ads')
                    option.value = '';
                option.textContent = 'Product'; 
                select.appendChild(option);
                data.forEach(element => {
                    let option = document.createElement('option') ;
                    option.value = element.id;
                    option.textContent = element.name;  
                    select.appendChild(option);
                });
                newDivProduct.appendChild(select);
        
                
                // DIV for quantity
                if(hasQuantity) return;
                const newDivQuantity = document.createElement('div');
                newDivQuantity.classList.add('input-item')
                newDivQuantity.classList.add('input-quantity')
                const input = document.createElement('input');
                input.type='number';
                input.name='Quantity';
                input.id='Quantity';
                input.placeholder='Quantity'
                newDivQuantity.appendChild(input);
                
                
                form.insertBefore(newDivProduct,date);
                form.insertBefore(newDivQuantity,date);
            }else{
                if(hasProduct){
                    form.removeChild(document.querySelector('.input-product'));
                }
                if(hasQuantity){
                    form.removeChild(document.querySelector('.input-quantity'));
                }
            }
            
        })
        const newDivProduct = document.createElement('div');
        newDivProduct.classList.add('input-item');
    
        const select = document.createElement('select');
        select.name = 'ProductId';
        let option = document.createElement('option') ;
        option.value = "";
        option.textContent = 'Product'; 
        select.appendChild(option);
        data.forEach(element => {
            let option = document.createElement('option') ;
            option.value = element.id;
            option.textContent = element.name;  
            select.appendChild(option);
        });
        newDivProduct.appendChild(select);
    
        
        filter.insertBefore(newDivProduct,dateFilter);
    })  
    .catch(error => console.error('Error loading JSON:', error));

// /////////////////////// // /////////////////////



// Disabling submit Button
submitButton.addEventListener("click", () => {
    button.disabled = true;
});

// set initial safe mode
if(safeModeToggle.checked)
expenseItemDelete.forEach(ele => ele.classList.add('disabled'));

// set on change
safeModeToggle.addEventListener('change',function(){
    if(safeModeToggle.checked) expenseItemDelete.forEach(ele => ele.classList.add('disabled'));
    else expenseItemDelete.forEach(ele => ele.classList.remove('disabled'));
})


// for details

detailsToggle.addEventListener('change',function(){
    if(detailsToggle.checked) {
        detailElement.forEach(ele => ele.classList.remove('hidden'));
        totalPrice.forEach(ele => ele.classList.add('hidden'));
    }
    else {
        detailElement.forEach(ele => ele.classList.add('hidden'));
        totalPrice.forEach(ele => ele.classList.remove('hidden'));
    }
})