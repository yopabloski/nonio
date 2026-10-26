suppressMessages({library(psych); library(polycor); library(GPArotation); library(jsonlite)})
X <- read.csv("items.csv"); C <- read.csv("cont.csv")
out <- list()
out$sw_cont <- unname(unlist(shapiro.test(C$cont)[c("statistic","p.value")]))
out$sw_skew <- unname(unlist(shapiro.test(C$skew)[c("statistic","p.value")]))
out$sw_small <- unname(unlist(shapiro.test(c(2.1,3.4,1.9,5.6,4.4,3.3,2.8,4.1,3.9))[c("statistic","p.value")]))
out$spear <- cor(X$i1, X$i5, method="spearman")
out$poly12 <- polychor(X$i1, X$i2)
out$poly15 <- polychor(X$i1, X$i5)
P <- matrix(1,8,8); for(i in 1:7) for(j in (i+1):8) {P[i,j] <- P[j,i] <- polychor(X[[i]],X[[j]])}
out$alpha_raw <- psych::alpha(X[,1:4], warnings=FALSE)$total$raw_alpha
out$alpha_ord <- psych::alpha(P[1:4,1:4], warnings=FALSE)$total$raw_alpha
fa1 <- fa(cor(X[,1:4]), nfactors=1, fm="pa", n.obs=150, max.iter=500)
l <- as.numeric(fa1$loadings); out$omega_pearson <- sum(l)^2/(sum(l)^2+sum(1-l^2))
out$loadings1 <- l
k <- KMO(P); out$kmo <- k$MSA
b <- cortest.bartlett(P, n=150); out$bartlett <- c(b$chisq, b$p.value)
fa2 <- fa(P, nfactors=2, fm="pa", rotate="oblimin", n.obs=150, max.iter=500)
out$fa2 <- unclass(fa2$loadings); out$phi <- fa2$Phi
pc <- partial.r(cor(X)); out$pcor13 <- pc[1,3]
m <- lm(C$cont ~ X$i1 + X$i5); s <- summary(m)
out$lm_coef <- unname(coef(m)); out$lm_r2 <- s$r.squared; out$lm_se <- unname(s$coefficients[,2]); out$lm_p <- unname(s$coefficients[,4])
g <- factor(X$i8)
kw <- kruskal.test(C$cont ~ g); out$kw <- c(kw$statistic, kw$p.value)
av <- summary(aov(C$cont ~ g))[[1]]; out$anova <- c(av$`F value`[1], av$`Pr(>F)`[1])
out$pt <- pt(2.1, 17); out$pf <- pf(3.2, 3, 40); out$pchi <- pchisq(7.5, 4)
out$skew <- c(e1071skew = NA)
cat(toJSON(out, digits=12, auto_unbox=TRUE))
