# Inherit from ubuntu docker image
FROM ubuntu:14.04

RUN apt-get update -y
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:ubuntu-toolchain-r/test

# Explicit set of apt-get commands to workaround issue https://github.com/nodegit/nodegit/issues/886 . Workaround instructions here: http://stackoverflow.com/questions/16605623/where-can-i-get-a-copy-of-the-file-libstdc-so-6-0-15
RUN apt-get update && apt-get install -y curl gcc-4.9 libstdc++6
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get dist-upgrade

RUN apt-get update && \
	apt-get install -y python python-dev python-pip git build-essential wget && \
	curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash - && \
	sudo apt-get -y install nodejs && \
	apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

#everything needed by extensions
RUN yes | pip install biopython

RUN pip install awscli

EXPOSE 3000
ENV PORT=3000

RUN mkdir /app
WORKDIR /app

#setup node
ADD package.json /app/package.json
RUN npm update -g npm && npm install

ADD . /app
#install extensions, continue even if errors
RUN npm run install-extensions || true

RUN cd /app

# Redis now launch via docker-compose and is referenced via link
CMD  ["npm" , "run", "start-instance"]
