# Inherit from node v4 docker image
FROM node:4-wheezy

RUN apt-get update
RUN apt-get install -y curl wget

ADD . /app

#setup node
ADD package.json /app/package.json
RUN npm update -g npm
RUN cd /app && npm install

EXPOSE 3000
ENV PORT=3000

WORKDIR /app

# Redis now launch via docker-compose and is referenced via link
ENTRYPOINT ["npm"]
CMD  ["run", "start"]

#everything needed by extensions
RUN apt-get install -y python python-pip
RUN yes | pip install biopython

RUN cd ~; perl -MNet::FTP -e '$ftp = new Net::FTP("ftp.ncbi.nlm.nih.gov", Passive => 1); $ftp->login; $ftp->binary; $ftp->get("/entrez/entrezdirect/edirect.zip");' unzip -u -q edirect.zip; rm edirect.zip; export PATH=$PATH:$HOME/edirect; ./edirect/setup.sh
