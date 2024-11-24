import $ from "jquery";
import { cookieExists, setCookie, getCookieValue, deleteCookie } from "cookies-utils";
import MarkdownIt from "markdown-it";
import { createHash } from "crypto";
import "./loadout";
import { getToken, setToken, setUsername } from "./states";
let mode = "normal"
console.log("homepage ts called")
export function setMode(md: string) {
	mode = md
}
export function getMode(): string {
	return mode
}
	$(document).ready(function () {
		$('.arrow').click(function () {
			$('.box-selectable').toggle();
			$(this).toggleClass('arrow-down');
		});
		$('.discord').click(function () {
			window.open('http://opensurviv.run.place/discord');
		});
		$('.info').click(function () {
			$('.info-box').toggle();
		});
		$('.close').click(function () {
			$('.info-box').hide();
			$('.partner-box').hide();
		});
		$('.partner').click(function () {
			$('.partner-box').toggle();
		});
		$('.loadout').click(function () { window.location.replace(window.location.href += "loadout") })
	});
	$.get("assets/" + getMode() + "/CREDITS.md", function (data) {
		document.getElementById("contents")!.innerHTML = new MarkdownIt().render(data);
	}, "text");
if (!window.location.href!.includes("/loadout")) {
	window.onload = function () {
		document.getElementById('loading')!.classList.add('zoom-out');
		setTimeout(function () {
			document.getElementById('loading')!.style.display = 'none';
		}, 1000);
	};
	document.addEventListener('DOMContentLoaded', function () {
		var audio = <HTMLAudioElement>document.getElementById('menu-audio');
		var volumeIcon = <HTMLDivElement>document.getElementById('volume-icon');
		var volumeSlider = <HTMLDivElement>document.getElementById('volume-slider');
		var volumeRange = <HTMLInputElement>document.getElementById('volume-range');

		var started = false;
		if (!started) {
			audio.play();
			started = true;
		}

		volumeIcon.addEventListener('click', function () {
			if (volumeSlider.style.display === 'none') {
				volumeSlider.style.display = 'block';
			} else {
				volumeSlider.style.display = 'none';
			}
		});


		volumeRange.addEventListener('input', function () {
			var volume = Number(volumeRange.value) / 100;
			audio.volume = volume;
		});
	});


	var accepted = -1;
	document.getElementById("button-accept")!.onclick = () => {
		showAds();
		accepted = 1;
		closeBox();
	}
	document.getElementById("button-decline")!.onclick = () => {
		hideAds();
		accepted = 0;
		closeBox();
	}
	document.getElementById("button-close")!.onclick = closeBox;
}
const modes = ["normal", "suroi_collab"]
modes.forEach(md => {
	console.log(document.getElementsByClassName("box-selectable")[0].children[modes.indexOf(md)].querySelector("div"))
	document.getElementsByClassName("box-selectable")[0].children[modes.indexOf(md)].querySelector("div")?.addEventListener("click", () => { setMode(md); console.log("DONE:)") })
})
console.log(getMode())
	function showAds() {
		document.querySelectorAll('.ads').forEach(ad => { (<HTMLElement>ad).style.visibility = "visible"; });
	}
	function hideAds() {
		const allElements = <HTMLCollectionOf<HTMLElement>>document.getElementsByTagName("*");
		for (let i = 0; i < allElements.length; i++) {
			if (allElements[i].tagName === "DIV" && allElements[i].hasAttribute("class") && allElements[i].getAttribute("class")!.includes("ads")) {
				allElements[i].style.display = "none";
			}
		}
	}
	function closeBox() {
		//document.getElementById("privacyBox").style.display = "none";
		document.querySelectorAll('.overlays').forEach(overlay => { (<HTMLElement>overlay).style.display = "none"; });
		//document.querySelectorAll('.boxers').forEach(boxer => { (<HTMLElement>boxer).style.display = "none"; });
		if (cookieExists("gave_me_cookies") && !cookieExists("ads"))
			setCookie({ name: "ads", value: accepted.toString() });
	}
	function setLoggedIn(username: string) {
		document.getElementById("account")!.innerHTML = `<h1>${username}</h1><h2 id="currency">Currency: 0</h2><div class="flex"><div class="button" id="button-logout">Log out</div></div>`;
		document.getElementById("button-logout")!.onclick = () => setLoggedOut(username);

		const input = <HTMLInputElement>document.getElementById("username");
		input.value = username;
		input.disabled = true;

		const token = cookieExists("gave_me_cookies") ? getCookieValue("access_token") : getToken();
		fetch("/api/currency", { headers: { "Authorization": "Bearer " + token } }).then(async res => {
			if (res.ok) document.getElementById("currency")!.innerHTML = `Currency: ${(await res.json()).currency}`;
		});
	}

	function setLoggedOut(username?: string) {
		document.getElementById("account")!.innerHTML = `
	<h1>Login / Sign up</h1>
	<input type="text" id="login_username" placeholder="Username..." ${username ? `value="${username}"` : ""} /><br>
	<input type="password" id="password" placeholder="Password..." /><br>
	<div class="flex">
		<div class="button" id="button-login">Login</div>
		<div class="button" id="button-signup">Sign up</div>
	</div>
	`;

		// Login and sign up buttons
		let loginWorking = false, signupWorking = false;
		document.getElementById("button-login")!.onclick = () => {
			if (loginWorking) return;
			loginWorking = true;
			const username = (<HTMLInputElement>document.getElementById("login_username")).value;
			const password = (<HTMLInputElement>document.getElementById("password")).value;
			if (!username || !password) return loginWorking = false;
			const hashed = createHash("sha1").update(password).digest("hex");
			fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password: hashed.slice(0, 16) }) })
				.then(async res => {
					if (res.ok) {
						if (cookieExists("gave_me_cookies")) {
							setCookie({ name: "username", value: username });
							setCookie({ name: "access_token", value: (await res.json()).accessToken });
						} else {
							setUsername(username);
							setToken((await res.json()).accessToken);
						}
						setLoggedIn(username);
					}
				})
				.finally(() => loginWorking = false);
		}

		document.getElementById("button-signup")!.onclick = () => {
			if (signupWorking) return;
			console.log("signing up");
			signupWorking = true;
			const username = (<HTMLInputElement>document.getElementById("login_username")).value;
			const password = (<HTMLInputElement>document.getElementById("password")).value;
			console.log(username, password);
			if (!username || !password) return signupWorking = false;
			const hashed = createHash("sha1").update(password).digest("hex");
			fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password: hashed.slice(0, 16) }) })
				.then(async res => {
					if (res.ok) {
						if (cookieExists("gave_me_cookies")) {
							setCookie({ name: "username", value: username });
							setCookie({ name: "access_token", value: (await res.json()).accessToken });
						} else {
							setUsername(username);
							setToken((await res.json()).accessToken);
						}
						setLoggedIn(username);
					}
				})
				.finally(() => signupWorking = false);
		}

		deleteCookie("access_token");
		setToken(undefined);

		const input = <HTMLInputElement>document.getElementById("username");
		input.value = "";
		input.disabled = false;
	}

	if (!cookieExists("gave_me_cookies")) {
		const button = document.getElementById("cookies-button")!;
		button.scrollIntoView();
		button.onclick = () => {
			setCookie({ name: "gave_me_cookies", value: "1" });
			button.classList.add("disabled");
			document.getElementById("cookies-span")!.innerHTML = "You gave me cookies :D";

			if (accepted >= 0)
				setCookie({ name: "ads", value: accepted.toString() });
		}

		setLoggedOut();
	} else {
		document.getElementById("cookies-button")!.classList.add("disabled");
		document.getElementById("cookies-span")!.innerHTML = "You gave me cookies :D";
		if (cookieExists("ads")) {
			const ads = getCookieValue("ads");
			if (ads == "1") showAds();
			else hideAds();
			closeBox();
		}

		checkLoggedIn();
	}

	export function checkLoggedIn() {
		if (cookieExists("username")) {
			const username = getCookieValue("username")!;
			if (cookieExists("access_token")) {
				const accessToken = getCookieValue("access_token");
				fetch("/api/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, accessToken }) })
					.then(res => {
						if (res.ok) setLoggedIn(username);
						else setLoggedOut(username);
					});
			} else setLoggedOut(username);
		} else setLoggedOut();
	}
