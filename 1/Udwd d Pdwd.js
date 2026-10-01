

document.getElementById("resposta").onclick = function() {
  let resposta = document.getElementById("01").value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

if (resposta == "lembranca") {
    window.location.href = "../2/Xlrhz_Uluz.html";
}
   else
   {
    alert("Você Errou Tente Novamente")
   }


}