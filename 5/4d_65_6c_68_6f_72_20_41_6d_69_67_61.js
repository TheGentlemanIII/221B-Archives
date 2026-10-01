
document.getElementById("resposta").onclick = function() {
  let resposta = document.getElementById("05").value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

if (resposta == "enemy") {
    window.location.href = "../6/IJCVGVCPJZAQ====.html";
}
   else
   {
    alert("Você Errou Tente Novamente")
   }


}