document.addEventListener('DOMContentLoaded', function () {
    const ammoColorMapping = {
        "9mm": "#FFD700",
        "12gauge": "#FF4500",
        "762mm": "#0000FF",
        "556mm": "#00FF00",
        "5.7mm": "#9400D3",
        "308subsonic": "#333333"
    };


    for (let ammoType in ammoColorMapping) {
        const ammoElement = document.querySelector(`#ammo-container .ammos[id="${mapAmmoID(ammoType)}"]`);
        if (ammoElement) {
            const colorIndicator = ammoElement.querySelector('.ammo-color');
            colorIndicator.style.backgroundColor = ammoColorMapping[ammoType];
        }
    }

    function mapAmmoID(ammoType) {
        switch (ammoType) {
            case "9mm": return "9";
            case "12gauge": return "12";
            case "762mm": return "7.62";
            case "556mm": return "5.56";
            case "5.7mm": return "5.7";
            case "308subsonic": return ".308";
            default: return "";
        }
    }
});
