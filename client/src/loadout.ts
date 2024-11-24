import "dotenv/config";
import { getToken } from "./states";
import { loadoutChange as changeCurrency } from "./utils";
import { cookieExists, getCookieValue } from "cookies-utils";
let currencyA = 0; const token = cookieExists("gave_me_cookies") ? getCookieValue("access_token") : getToken();
let skinsAvailable: string[] = [];
let _skin = "";
if (token != undefined) {
    if (cookieExists("username")) {
        const username = getCookieValue("username")!;
        if (cookieExists("access_token")) {
            const accessToken = getCookieValue("access_token");
            fetch("/api/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, accessToken }) })
                .then(res => {
                    if (res.ok) {
                        fetch("/api/currency", { headers: { "Authorization": "Bearer " + (token as string) } }).then(async res => {
                            if (res.ok) currencyA = (await res.json()).currency;
                        });
                        fetch("/api/getSkins", { headers: { "Authorization": "Bearer " + (token as string) } }).then(async res => {
                            if (res.ok) {
                                _skin = (await res.json()).skinsAvailable;
                                skinsAvailable = _skin.split(";")
                                console.log(skinsAvailable)
                            }
                        });
                    }
                });
        }
    }
}
if (window.location.href!.includes("/loadout")) {
    let container2Visible = false;
    // Function to show the selected tab content
    function showTab(tabName: string) {
        const tabContents = document.getElementsByClassName('tab-content');
        for (const content of tabContents) {
            (content as HTMLElement).style.display = 'none';
        }
        (<HTMLElement>document.getElementById(tabName)).style.display = 'block';

        if (tabName === 'skins') {
            showContainer2();
        } else {
            hideContainer2();
        }
    }

    // Show loadout container when the loadout button is clicked
    (<HTMLElement>document.getElementById('loadout-button')).addEventListener('click', function () {
        const container = document.getElementById('loadout-container');
        const overlay = document.getElementById('overlay');
        (<HTMLElement>container).style.display = 'block';
        (<HTMLElement>overlay).style.display = 'block';
        showTab('skins'); // Show the 'Skins' tab by default
    });
    (<HTMLElement>document.getElementById('loadout-button')).click();
    // Function to close the loadout container
    function closeLoadout() {
        hideContainer2();
        const container = document.getElementById('loadout-container');
        const overlay = document.getElementById('overlay');
        if (container && overlay) {
            (container as HTMLElement).style.display = 'none';
            (overlay as HTMLElement).style.display = 'none';
        }

        window.location.href = '/';
    }
    (window as any).closeLoadout = closeLoadout;
      
    // Function to show container2
    function showContainer2() {
        const container2 = document.getElementById('container2');
        (<HTMLElement>container2).style.display = 'block';
        container2Visible = true;
    }

    // Function to hide container2
    function hideContainer2() {
        const container2 = document.getElementById('container2');
        (<HTMLElement>container2).style.display = 'none';
        container2Visible = false;
    }


    //javascript for skins
    document.addEventListener('DOMContentLoaded', () => {
        // Get all the "Select" buttons for skins
        const selectButtons = document.querySelectorAll('.card-list__item.card .card__button');
        // Function to handle the selection of a skin
        function handleSelectSkin(event: any) {
            function _applySkin() {
                (<HTMLElement>selectedSVGContainer).innerHTML = selectedSVG;
                localStorage.setItem('loadoutSkinTexture', selectedSVG);
                localStorage.setItem('playerSkin', name as string)
}
            const selectedSVG = event.currentTarget.parentNode.previousElementSibling.querySelector('svg').outerHTML;
            const div1 = event.currentTarget.parentNode.previousElementSibling.querySelector("div") as HTMLDivElement
            const div = div1.querySelector("div")?.querySelector("div") as HTMLDivElement
            const currencyOfSkin = div.getAttribute("currency");
            const name = div.getAttribute("id");
            const selectedSVGContainer = document.getElementById('selected-svg-container');
            if (!(skinsAvailable as string[]).includes(name as string)) {
                if (currencyA >= Number(currencyOfSkin)) {
                    changeCurrency(token as string, name as string, Number(currencyOfSkin));
                    alert("Transaction completed! Enjoy your new skin :P")
                    _applySkin()
                }
                else { alert("Not enough credits"); return 0; }
            }
            else { _applySkin(); alert("Equipped " + name as string + " skin succesfully! :P") }
        }
        function _selectButtonForEachFunction(button: Element) {
            let skins: string[] = []
            fetch("/api/getSkins", { headers: { "Authorization": "Bearer " + (token as string) } }).then(async res => {
                if (res.ok) {
                    _skin = (await res.json()).skinsAvailable;
                    skins = _skin.split(";")
                }
            }).then(() => {
                const buttonID = button.getAttribute("id")
            if((skins as string[]).includes(buttonID as string)) { button.textContent = "Equip Skin"; (button as HTMLElement).style.background = "#00ff00" }
            button.addEventListener('click', handleSelectSkin);
        })
            return button
        }
        // Add click event listener to each "Select" button for skins
        selectButtons.forEach(button => { _selectButtonForEachFunction(button)
            
        });

        // Retrieve the last selected skin from localStorage and display it on page load
        const lastSelectedSVG = localStorage.getItem('loadoutSkinTexture');
        if (lastSelectedSVG) {
            const selectedSVGContainer = document.getElementById('selected-svg-container');
            (<HTMLElement>selectedSVGContainer).innerHTML = lastSelectedSVG;
        } else {
            // If no skin has been selected before, automatically select the "Islander-Deafult" skin
            const defaultSVG = (<HTMLElement>document.querySelector('.card-list__item.card:nth-child(1) svg')).outerHTML;
            const selectedSVGContainer = document.getElementById('selected-svg-container');
            (<HTMLElement>selectedSVGContainer).innerHTML = defaultSVG;
            localStorage.setItem('loadoutSkinTexture', defaultSVG);
            localStorage.setItem('playerSkin', "default")
        }
    });

    // Function to change the cursor
    function changeCursor(cursorType: string) {
        document.documentElement.style.cursor = cursorType;
        // Store the chosen cursor in local storage
        localStorage.setItem('chosenCursor', cursorType);
    }


    // Function to reset the cursor to default
    function resetCursor() {
        document.documentElement.style.cursor = 'default';
        // Remove the chosen cursor from local storage
        localStorage.removeItem('chosenCursor');
    }


    // Check for a stored cursor and apply it on page load
    const storedCursor = localStorage.getItem('chosenCursor');
    if (storedCursor) {
        changeCursor(storedCursor);
    }
}
else { console.log("FALSE"); }