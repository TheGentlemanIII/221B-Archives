
document.getElementById("resposta").onclick = function() {
  let resposta = document.getElementById("06").value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

if (resposta == "homero") {
    window.location.href = "../8/8.html";
}
   else
   {
    alert("Você Errou Tente Novamente")
   }


}