

document.getElementById("resposta").onclick = function() {
  let resposta = document.getElementById("02").value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

if (resposta == "lupin") {
    window.location.href = "../3/Wzeua.html";
}
   else
   {
    alert("Você Errou Tente Novamente")
   }


}