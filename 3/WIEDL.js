
document.getElementById("resposta").onclick = function() {
  let resposta = document.getElementById("03").value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

if (resposta == "wyvern") {
    window.location.href = "../4/VmVyZGUgbMOpc2JpY2E=.html";
}
   else
   {
    alert("Você Errou Tente Novamente")
   }


}