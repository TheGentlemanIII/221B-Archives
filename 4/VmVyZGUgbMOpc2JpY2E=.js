
document.getElementById("resposta").onclick = function() {
  let resposta = document.getElementById("04").value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

if (resposta == "busca") {
    window.location.href = "../5/4d_65_6c_68_6f_72_20_41_6d_69_67_61.html";
}
   else
   {
    alert("Você Errou Tente Novamente")
   }


}