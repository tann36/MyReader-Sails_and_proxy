Käivitamine:
	
	Solri-i proxy käivitamine:
		installeerida node aadressilt http://nodejs.org/download/
		pakkida lahti kaust "MyReader"
		navigeerida konsoolis kausta: ...\MyReader\solr_proxy
		käivitada käsklusega: node solrProxyConnection
		
		proxy pordi muutmine:
			...\MyReader\solr_proxy\solrProxyConnection.js
			rida 19: listen(8008, function() {
			
		solr-i asukohast teada andmine: 
			...\MyReader\solr_proxy\solrProxyConnection.js
			rida 13: var proxyOptions = { ...
	
	
	Sails serveri käivitamine:
		navigeerida konsoolis kausta "MyReader\Sails\"
		käivitada käsklusega: sails lift
	
		Sails pordi muumine:
		MyReader\Sails\config\local.js
		rida 39: port: process.env.PORT || 1337,



MyReader kasutamine:
	Artikleid on võimalik lugeda aadressilt: http:\\localhost:1337 (Sails serveri asukoht)

	Et mõni kategooria oleks suur juba lehte laadides, kasutada http:\\localhost:1337\tag\*kategooria*  
	(asendades *kategooria* sektsiooni pealkirjaga)

